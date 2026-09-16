const { getDB } = require("../config/db");

const COLLECTION = "jobs";

async function createJob(datasetId) {
  const db = getDB();
  const job = {
    jobId: `job_${Date.now()}`,
    datasetId,
    status: "queued",
    totalRows: 0,
    processedRows: 0,
    successfulRows: 0,
    failedRows: 0,
    rowsPerSecond: 0,
    createdAt: new Date(),
    startedAt: null,
    completedAt: null
  };
  await db.collection(COLLECTION).insertOne(job);
  return job;
}

async function getJob(jobId) {
  const db = getDB();
  return db.collection(COLLECTION).findOne({
    jobId
  });
}

async function updateJob(jobId, updates) {
  const db = getDB();
  await db.collection(COLLECTION).updateOne(
    { jobId },
    {
      $set: updates
    }
  );
  return getJob(jobId);
}

module.exports = {
  createJob,
  getJob,
  updateJob
};
