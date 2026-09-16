/**
 * Job Status Constants and Utility functions
 */
const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
};

function calculateRowsPerSecond(processedRows, startTime, endTime = new Date()) {
  if (!startTime || !processedRows) return 0;
  const durationInSeconds = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
  if (durationInSeconds <= 0) return 0;
  return Math.round(processedRows / durationInSeconds);
}

module.exports = {
  JOB_STATUS,
  calculateRowsPerSecond
};
