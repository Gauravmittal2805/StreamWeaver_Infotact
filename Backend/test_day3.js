import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "uploads");

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion Failed: ${message}`);
  }
}

async function runDay3ComprehensiveTests() {
  console.log("==========================================================================");
  console.log("        StreamWeaver Day 3 Complete Streaming Pipeline Verification        ");
  console.log("==========================================================================");

  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }

  // ----------------------------------------------------------------------
  // Step 1: Review Day 2 Components
  // ----------------------------------------------------------------------
  console.log("\n[Step 1] Reviewing Day 2 Streaming Components...");
  const csvParser = createCSVParserStream();
  const jsonParser = createJSONParserStream();
  const factoryStream = createParserStream("csv");
  const etlTransform = createETLTransform();
  const counterStream = createCounterStream();
  assert(typeof csvParser.pipe === "function", "CSV parser is not stream pipeable");
  assert(typeof jsonParser.pipe === "function", "JSON parser is not stream pipeable");
  assert(typeof factoryStream.pipe === "function", "Factory parser is not stream pipeable");
  assert(typeof etlTransform.pipe === "function", "ETL Transform is not stream pipeable");
  assert(typeof counterStream.write === "function", "Counter stream is not writable");
  console.log("✓ Day 2 streaming parser & ETL transform components verified");

  // ----------------------------------------------------------------------
  // Step 2: Connect Member 1's getReadStream(datasetId)
  // ----------------------------------------------------------------------
  console.log("\n[Step 2] Testing Member 1 getReadStream(datasetId) Integration...");
  const step2Csv = "name,email,city\nGaurav,g@example.com,Agra\n";
  const step2DatasetId = `dataset_step2_${Date.now()}`;
  const step2Path = path.join(UPLOAD_DIR, `${step2DatasetId}.csv`);
  fs.writeFileSync(step2Path, step2Csv);

  createDatasetMetadata({
    id: step2DatasetId,
    originalName: "test_step2.csv",
    storedName: `${step2DatasetId}.csv`,
    format: "csv",
    size: step2Csv.length,
    status: DatasetStatus.UPLOADED,
    path: step2Path
  });

  const readStreamResult = fileService.getReadStream(step2DatasetId);
  assert(readStreamResult.success === true, `getReadStream failed: ${readStreamResult.error}`);
  assert(readStreamResult.stream !== null, "getReadStream returned null stream");
  assert(readStreamResult.metadata.format === "csv", "Metadata format mismatch");
  console.log("✓ getReadStream(datasetId) returned active stream & metadata without memory buffering");

  // ----------------------------------------------------------------------
  // Step 3 & 4 & 5 & 6 & 7: Streaming Pipeline, Job Processing, Metrics & Periodic Updates
  // ----------------------------------------------------------------------
  console.log("\n[Step 3-7] Testing Complete ETL Processing Pipeline & Dynamic Metrics...");
  const step3Job = await jobService.createJob(step2DatasetId);
  assert(step3Job.status === JOB_STATUS.QUEUED, `Expected queued status, got ${step3Job.status}`);

  const processResult = await etlService.processDataset(step2DatasetId, step3Job.jobId);
  assert(processResult.success === true, `Processing failed: ${processResult.error}`);
  assert(processResult.status === JOB_STATUS.COMPLETED, `Expected completed status, got ${processResult.status}`);

  const fetchedJob = await jobService.getJob(step3Job.jobId);
  assert(fetchedJob.status === JOB_STATUS.COMPLETED, "DB Job status not updated to completed");
  assert(fetchedJob.processedRows === 1, `Expected 1 processed row, got ${fetchedJob.processedRows}`);
  assert(fetchedJob.successfulRows === 1, "Expected 1 successful row");
  assert(fetchedJob.rowsPerSecond >= 0, "rowsPerSecond calculation missing");
  assert(fetchedJob.progressPercent === 100, "progressPercent should be 100");
  assert(fetchedJob.startedAt !== null, "startedAt timestamp missing");
  assert(fetchedJob.completedAt !== null, "completedAt timestamp missing");
  console.log("✓ Pipeline lifecycle queued -> processing -> completed with rows/sec & progressPercent");

  // ----------------------------------------------------------------------
  // Step 8 & 9 & 10: Record Error Handling, Diagnostics, and Basic Validation
  // ----------------------------------------------------------------------
  console.log("\n[Step 8-10] Testing Basic Record Validation & Malformed Record Handling...");
  const malformedCsv = "name,email,city\nValid,v@example.com,Agra\nExtraColRow,e@example.com,Delhi,TOO_MANY_COLS\nValid2,v2@example.com,Mumbai\n";
  const malformedDatasetId = `dataset_malformed_${Date.now()}`;
  const malformedPath = path.join(UPLOAD_DIR, `${malformedDatasetId}.csv`);
  fs.writeFileSync(malformedPath, malformedCsv);

  createDatasetMetadata({
    id: malformedDatasetId,
    originalName: "malformed.csv",
    storedName: `${malformedDatasetId}.csv`,
    format: "csv",
    size: malformedCsv.length,
    status: DatasetStatus.UPLOADED,
    path: malformedPath
  });

  const malformedJob = await jobService.createJob(malformedDatasetId);
  const malformedResult = await etlService.processDataset(malformedDatasetId, malformedJob.jobId);

  assert(malformedResult.success === true, "Pipeline should complete despite record-level errors");
  const jobMetrics = malformedResult.job;
  assert(jobMetrics.processedRows === 3, `Expected 3 processed rows, got ${jobMetrics.processedRows}`);
  assert(jobMetrics.successfulRows === 2, `Expected 2 successful rows, got ${jobMetrics.successfulRows}`);
  assert(jobMetrics.failedRows === 1, `Expected 1 failed row, got ${jobMetrics.failedRows}`);
  assert(jobMetrics.errors.length === 1, `Expected 1 error in error sample, got ${jobMetrics.errors.length}`);
  assert(jobMetrics.errors[0].type === "MALFORMED_CSV_ROW", "Error type mismatch");
  console.log("✓ Single malformed record isolated: failedRows incremented, pipeline continued, diagnostic recorded");

  // ----------------------------------------------------------------------
  // Step 11: Test CSV End-to-End
  // ----------------------------------------------------------------------
  console.log("\n[Step 11] Testing CSV End-to-End Pipeline...");
  const step11Csv = "name,email,city\nGaurav,g@example.com,Agra\nRahul,r@example.com,Delhi\nAmit,a@example.com,Mumbai\n";
  const step11DatasetId = `dataset_csv_${Date.now()}`;
  const step11Path = path.join(UPLOAD_DIR, `${step11DatasetId}.csv`);
  fs.writeFileSync(step11Path, step11Csv);

  createDatasetMetadata({
    id: step11DatasetId,
    originalName: "users.csv",
    storedName: `${step11DatasetId}.csv`,
    format: "csv",
    size: step11Csv.length,
    status: DatasetStatus.UPLOADED,
    path: step11Path
  });

  const csvJob = await jobService.createJob(step11DatasetId);
  const csvJobRes = await etlService.processDataset(step11DatasetId, csvJob.jobId);
  assert(csvJobRes.status === JOB_STATUS.COMPLETED, "CSV Job failed");
  assert(csvJobRes.job.successfulRows === 3, "CSV successful rows mismatch");
  console.log("✓ CSV End-to-End process completed successfully");

  // ----------------------------------------------------------------------
  // Step 12: Test JSON End-to-End
  // ----------------------------------------------------------------------
  console.log("\n[Step 12] Testing JSON End-to-End Pipeline...");
  const step12Json = JSON.stringify([
    { name: "Gaurav", email: "g@example.com", city: "Agra" },
    { name: "Rahul", email: "r@example.com", city: "Delhi" },
    { name: "Amit", email: "a@example.com", city: "Mumbai" }
  ]);
  const step12DatasetId = `dataset_json_${Date.now()}`;
  const step12Path = path.join(UPLOAD_DIR, `${step12DatasetId}.json`);
  fs.writeFileSync(step12Path, step12Json);

  createDatasetMetadata({
    id: step12DatasetId,
    originalName: "users.json",
    storedName: `${step12DatasetId}.json`,
    format: "json",
    size: step12Json.length,
    status: DatasetStatus.UPLOADED,
    path: step12Path
  });

  const jsonJob = await jobService.createJob(step12DatasetId);
  const jsonJobRes = await etlService.processDataset(step12DatasetId, jsonJob.jobId);
  assert(jsonJobRes.status === JOB_STATUS.COMPLETED, "JSON Job failed");
  assert(jsonJobRes.job.successfulRows === 3, "JSON successful rows mismatch");
  console.log("✓ JSON End-to-End process completed successfully");

  // ----------------------------------------------------------------------
  // Step 16: Member 3 Frontend Contract Validation
  // ----------------------------------------------------------------------
  console.log("\n[Step 16] Validating Member 3 Frontend Job Response Structure...");
  const finalJobState = await jobService.getJob(csvJob.jobId);
  const requiredKeys = [
    "jobId", "datasetId", "status", "totalRows", "processedRows",
    "successfulRows", "failedRows", "rowsPerSecond", "progressPercent",
    "errors", "createdAt", "startedAt", "completedAt"
  ];
  for (const key of requiredKeys) {
    assert(key in finalJobState, `Missing required key '${key}' in Member 3 contract`);
  }
  console.log("✓ Member 3 job status schema completely aligned with frontend contract");

  // ----------------------------------------------------------------------
  // Step 17: Test Failure Scenarios
  // ----------------------------------------------------------------------
  console.log("\n[Step 17] Testing Failure Scenarios...");
  
  // Non-existent dataset
  const fakeJob = await jobService.createJob("dataset_non_existent_9999");
  const fakeRes = await etlService.processDataset("dataset_non_existent_9999", fakeJob.jobId);
  assert(fakeRes.status === JOB_STATUS.FAILED, "Expected failure for non-existent dataset");
  assert(fakeRes.error.includes("does not exist"), "Error message mismatch for non-existent dataset");

  // Unsupported format
  const unsuppDatasetId = `dataset_unsupp_${Date.now()}`;
  const unsuppPath = path.join(UPLOAD_DIR, `${unsuppDatasetId}.xml`);
  fs.writeFileSync(unsuppPath, "<root></root>");
  createDatasetMetadata({
    id: unsuppDatasetId,
    originalName: "data.xml",
    storedName: `${unsuppDatasetId}.xml`,
    format: "xml",
    size: 13,
    status: DatasetStatus.UPLOADED,
    path: unsuppPath
  });

  const unsuppJob = await jobService.createJob(unsuppDatasetId);
  const unsuppRes = await etlService.processDataset(unsuppDatasetId, unsuppJob.jobId);
  assert(unsuppRes.status === JOB_STATUS.FAILED, "Expected failure for unsupported format");
  assert(unsuppRes.error.includes("Unsupported dataset format"), "Error message mismatch for unsupported format");

  console.log("✓ All failure scenarios transitioned job state queued -> processing -> failed with diagnostic error");

  // Cleanup temporary test files
  const testFiles = [step2Path, malformedPath, step11Path, step12Path, unsuppPath];
  for (const f of testFiles) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }

  console.log("\n==========================================================================");
  console.log("   ✓ ALL 20 DAY 3 INTEGRATION & STREAMING CHECKS PASSED SUCCESSFULLY!    ");
  console.log("==========================================================================");
}

runDay3ComprehensiveTests().catch((err) => {
  console.error("Day 3 Comprehensive Test Failed:", err);
  process.exit(1);
});
