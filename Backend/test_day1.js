require("dotenv").config();
const { connectDB, getDB, closeDB } = require("./src/config/db");
const jobService = require("./src/services/job.service");
const etlService = require("./src/services/etl.service");
const { createETLTransform } = require("./src/streams/etl.stream");

async function runTests() {
  console.log("--- Starting Day 1 Verification Tests ---");
  try {
    // 1. Test MongoDB connection
    const db = await connectDB();
    console.log("✓ MongoDB connected successfully to database:", db.databaseName);

    // 2. Test Job Service: createJob
    const testDatasetId = `dataset_test_${Date.now()}`;
    const newJob = await jobService.createJob(testDatasetId);
    console.log("✓ Job created successfully:", newJob);

    // 3. Test Job Service: getJob
    const fetchedJob = await jobService.getJob(newJob.jobId);
    console.log("✓ Job fetched successfully:", fetchedJob);
    if (fetchedJob.jobId !== newJob.jobId || fetchedJob.datasetId !== testDatasetId) {
      throw new Error("Job data mismatch!");
    }

    // 4. Test Job Service: updateJob
    const updatedJob = await jobService.updateJob(newJob.jobId, {
      status: "processing",
      processedRows: 100,
      rowsPerSecond: 50
    });
    console.log("✓ Job updated successfully:", updatedJob.status, "processedRows:", updatedJob.processedRows);

    // 5. Test ETL Service skeleton
    const etlResult = await etlService.processDataset(testDatasetId, newJob.jobId);
    console.log("✓ ETL Service result:", etlResult);

    // 6. Test ETL Transform stream skeleton
    const transformStream = createETLTransform();
    console.log("✓ ETL Transform stream created successfully:", typeof transformStream.pipe === "function");

    console.log("--- All Day 1 Service Tests Passed! ---");
  } catch (err) {
    console.error("Test failed with error:", err);
    process.exitCode = 1;
  } finally {
    await closeDB();
    console.log("MongoDB connection closed.");
  }
}

runTests();
