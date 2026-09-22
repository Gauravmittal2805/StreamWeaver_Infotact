import dotenv from "dotenv";
dotenv.config();

import { Readable, Writable } from "stream";
import * as fileService from "./src/services/file.service.js";
import * as jobService from "./src/services/job.service.js";
import * as etlService from "./src/services/etl.service.js";
import { createCSVParserStream } from "./src/parsers/csv.parser.js";
import { createJSONParserStream } from "./src/parsers/json.parser.js";
import { createParserStream, UnsupportedFormatError } from "./src/parsers/parser.factory.js";
import { createETLTransform } from "./src/streams/etl.stream.js";
import { createCounterStream } from "./src/streams/counter.stream.js";
import { JOB_STATUS } from "./src/utils/job.utils.js";
import { createDatasetMetadata, DatasetStatus } from "./src/services/dataset.service.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "uploads");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDay2Tests() {
  console.log("====================================================");
  console.log("         StreamWeaver Day 2 Test Suite              ");
  console.log("====================================================");

  try {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // ----------------------------------------------------
    // Test 1: Member 1 Stream Contract & Metadata Lookup
    // ----------------------------------------------------
    console.log("\n[Test 1] Testing Member 1 Stream Contract & Metadata...");
    const sampleCsvData = "name,age,city\nGaurav,21,Agra\nAkshat,22,Delhi\n";
    const testDatasetId = `dataset_test_${Date.now()}`;
    const testFilePath = path.join(UPLOAD_DIR, `${testDatasetId}.csv`);

    fs.writeFileSync(testFilePath, sampleCsvData);
    createDatasetMetadata({
      id: testDatasetId,
      originalName: "test.csv",
      storedName: `${testDatasetId}.csv`,
      format: "csv",
      size: sampleCsvData.length,
      status: DatasetStatus.UPLOADED,
      path: testFilePath
    });

    const meta = fileService.getDataset(testDatasetId);
    assert(meta.format === "csv", `Expected format 'csv', got ${meta.format}`);
    assert(meta.id === testDatasetId, "DatasetId mismatch");

    const readStreamResult = fileService.getReadStream(testDatasetId);
    assert(readStreamResult.success === true, `getReadStream failed: ${readStreamResult.error}`);
    assert(typeof readStreamResult.stream.pipe === "function", "getReadStream stream does not have pipe");
    console.log("✓ Member 1 Stream contract verified (datasetId -> fileService -> Readable Stream)");

    // ----------------------------------------------------
    // Test 2: CSV Streaming Parser (incremental & object keys)
    // ----------------------------------------------------
    console.log("\n[Test 2] Testing CSV Streaming Parser...");
    const csvStream = Readable.from(["name,age,city\nAlice,28,Berlin\nBob,32,Paris\n"]);
    const csvParser = createCSVParserStream();
    const parsedCsvRecords = [];

    await new Promise((resolve, reject) => {
      csvStream
        .pipe(csvParser)
        .on("data", (rec) => parsedCsvRecords.push(rec))
        .on("end", resolve)
        .on("error", reject);
    });

    assert(parsedCsvRecords.length === 2, `Expected 2 records, got ${parsedCsvRecords.length}`);
    assert(parsedCsvRecords[0].name === "Alice" && parsedCsvRecords[0].age === "28", "First CSV record mismatch");
    assert(parsedCsvRecords[1].name === "Bob" && parsedCsvRecords[1].city === "Paris", "Second CSV record mismatch");
    console.log("✓ CSV parser emitted records incrementally with headers as object keys");

    // ----------------------------------------------------
    // Test 3: JSON Streaming Parser (incremental & object mode)
    // ----------------------------------------------------
    console.log("\n[Test 3] Testing JSON Streaming Parser...");
    const jsonChunks = [
      '[\n  { "name": "Gaurav", "age": 21, "city": "Agra" },\n',
      '  { "name": "Akshat", "age": 22, "city": "Delhi" }\n]'
    ];
    const jsonStream = Readable.from(jsonChunks);
    const jsonParser = createJSONParserStream();
    const parsedJsonRecords = [];

    await new Promise((resolve, reject) => {
      jsonStream
        .pipe(jsonParser)
        .on("data", (rec) => parsedJsonRecords.push(rec))
        .on("end", resolve)
        .on("error", reject);
    });

    assert(parsedJsonRecords.length === 2, `Expected 2 records, got ${parsedJsonRecords.length}`);
    assert(parsedJsonRecords[0].name === "Gaurav" && parsedJsonRecords[0].age === 21, "First JSON record mismatch");
    assert(parsedJsonRecords[1].name === "Akshat" && parsedJsonRecords[1].city === "Delhi", "Second JSON record mismatch");
    console.log("✓ JSON parser emitted records incrementally from array stream");

    // ----------------------------------------------------
    // Test 4: Common Parser Factory & Format Detection
    // ----------------------------------------------------
    console.log("\n[Test 4] Testing Common Parser Factory & Format Detection...");
    const csvFactoryStream = createParserStream("csv");
    assert(typeof csvFactoryStream.pipe === "function", "CSV factory stream invalid");

    const jsonFactoryStream = createParserStream("json");
    assert(typeof jsonFactoryStream.pipe === "function", "JSON factory stream invalid");

    let errorThrown = false;
    try {
      createParserStream("xml");
    } catch (e) {
      if (e instanceof UnsupportedFormatError) {
        errorThrown = true;
      }
    }
    assert(errorThrown, "UnsupportedFormatError was not thrown for unsupported format 'xml'");
    console.log("✓ Common parser interface handles CSV, JSON, and cleanly rejects unknown formats");

    // ----------------------------------------------------
    // Test 5: ETL Transform Stream
    // ----------------------------------------------------
    console.log("\n[Test 5] Testing ETL Transform Stream (Object Mode & Normalization)...");
    const transform = createETLTransform();
    const recordsToTransform = [{ name: "  Untrimmed Name  ", age: " 25 " }];
    const transformedRecords = [];

    await new Promise((resolve, reject) => {
      Readable.from(recordsToTransform, { objectMode: true })
        .pipe(transform)
        .on("data", (rec) => transformedRecords.push(rec))
        .on("end", resolve)
        .on("error", reject);
    });

    assert(transformedRecords[0].name === "Untrimmed Name", "String was not trimmed");
    assert(transformedRecords[0].age === "25", "Age was not trimmed");
    assert(transformedRecords[0]._processedAt !== undefined, "_processedAt timestamp missing");
    console.log("✓ ETL Transform stream functions in objectMode and performs normalization");

    // ----------------------------------------------------
    // Test 6: Record Counters & Malformed Record Handling
    // ----------------------------------------------------
    console.log("\n[Test 6] Testing Record Counters & Malformed Record Handling...");
    const mixedRecords = [
      { id: 1, name: "Valid_1" },
      { _isMalformed: true, rowNumber: 2, error: { type: "PARSE_ERROR", message: "Bad token" } },
      { id: 3, name: "Valid_2" }
    ];

    const counter = createCounterStream({ progressIntervalMs: 100 });
    await new Promise((resolve, reject) => {
      Readable.from(mixedRecords, { objectMode: true })
        .pipe(counter)
        .on("finish", resolve)
        .on("error", reject);
    });

    const metrics = counter.getMetrics();
    assert(metrics.recordsReceived === 3, `Expected 3 received, got ${metrics.recordsReceived}`);
    assert(metrics.successfulRows === 2, `Expected 2 successful, got ${metrics.successfulRows}`);
    assert(metrics.failedRows === 1, `Expected 1 failed, got ${metrics.failedRows}`);
    assert(metrics.errors.length === 1, `Expected 1 error recorded, got ${metrics.errors.length}`);
    assert(metrics.errors[0].rowNumber === 2, "Error row number mismatch");
    console.log("✓ Record counter maintained accurate counts and tracked malformed record diagnostics");

    // ----------------------------------------------------
    // Test 7: Stream Backpressure Flow Control
    // ----------------------------------------------------
    console.log("\n[Test 7] Testing Stream Backpressure Flow Control...");
    let readCount = 0;
    let maxQueue = 0;
    let currentInFlight = 0;

    const testDataSource = new Readable({
      objectMode: true,
      highWaterMark: 16,
      read() {
        if (readCount < 100) {
          readCount++;
          currentInFlight++;
          maxQueue = Math.max(maxQueue, currentInFlight);
          this.push({ id: readCount, data: "x".repeat(100) });
        } else {
          this.push(null);
        }
      }
    });

    const slowConsumer = new Writable({
      objectMode: true,
      highWaterMark: 16,
      write(chunk, encoding, callback) {
        setImmediate(() => {
          currentInFlight--;
          callback();
        });
      }
    });

    await new Promise((resolve, reject) => {
      testDataSource
        .pipe(createETLTransform())
        .pipe(slowConsumer)
        .on("finish", resolve)
        .on("error", reject);
    });

    console.log(`  Total items: ${readCount}, Max in-flight queue: ${maxQueue}`);
    assert(maxQueue < 100, `Backpressure violation: max in-flight (${maxQueue}) exceeded safe bounds`);
    console.log("✓ Backpressure preserved throughout the stream pipeline");

    // ----------------------------------------------------
    // Test 8: End-to-End ETL Service with Job Lifecycle
    // ----------------------------------------------------
    console.log("\n[Test 8] Testing End-to-End ETL Service & Job Lifecycle...");
    const e2eCsv = "id,name,role\n1,Alice,Engineer\n2,Bob,Manager\n3,Charlie,Designer\n";
    const e2eDatasetId = `dataset_e2e_${Date.now()}`;
    const e2eFilePath = path.join(UPLOAD_DIR, `${e2eDatasetId}.csv`);

    fs.writeFileSync(e2eFilePath, e2eCsv);
    createDatasetMetadata({
      id: e2eDatasetId,
      originalName: "employees.csv",
      storedName: `${e2eDatasetId}.csv`,
      format: "csv",
      size: e2eCsv.length,
      status: DatasetStatus.UPLOADED,
      path: e2eFilePath
    });

    const newJob = await jobService.createJob(e2eDatasetId);
    assert(newJob.status === JOB_STATUS.QUEUED, `Initial status expected 'queued', got ${newJob.status}`);

    const result = await etlService.processDataset(e2eDatasetId, newJob.jobId);
    assert(result.success === true, "ETL processing returned failure");
    assert(result.status === JOB_STATUS.COMPLETED, `Final status expected 'completed', got ${result.status}`);

    const completedJob = await jobService.getJob(newJob.jobId);
    assert(completedJob.status === JOB_STATUS.COMPLETED, "Job status not updated to completed in DB");
    assert(completedJob.processedRows === 3, `Expected 3 processedRows, got ${completedJob.processedRows}`);
    assert(completedJob.successfulRows === 3, `Expected 3 successfulRows, got ${completedJob.successfulRows}`);
    assert(completedJob.failedRows === 0, `Expected 0 failedRows, got ${completedJob.failedRows}`);
    assert(completedJob.startedAt !== null, "startedAt timestamp missing");
    assert(completedJob.completedAt !== null, "completedAt timestamp missing");
    console.log("✓ Job lifecycle: queued -> processing -> completed with counters and timestamps");

    // Clean up temporary files
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (fs.existsSync(e2eFilePath)) fs.unlinkSync(e2eFilePath);

    console.log("\n====================================================");
    console.log("   ✓ ALL DAY 2 INTEGRATION TESTS PASSED SUCCESSFULLY! ");
    console.log("====================================================");
  } catch (err) {
    console.error("Day 2 Tests Failed:", err);
    process.exit(1);
  }
}

runDay2Tests();
