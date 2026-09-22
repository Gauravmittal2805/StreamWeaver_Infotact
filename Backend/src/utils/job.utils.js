/**
 * Job Status Constants and Utility functions
 */
export const JOB_STATUS = {
  QUEUED: "queued",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  CANCELLED: "cancelled"
};

export function calculateRowsPerSecond(processedRows, startTime, endTime = new Date()) {
  if (!startTime || !processedRows) return 0;
  const durationInSeconds = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000;
  if (durationInSeconds <= 0) return 0;
  return Math.round(processedRows / durationInSeconds);
}

export function calculateProgressPercent(processedRows, totalRows) {
  if (!totalRows || totalRows <= 0) return 0;
  if (!processedRows || processedRows <= 0) return 0;
  return Math.min(100, Math.round((processedRows / totalRows) * 100));
}

export default {
  JOB_STATUS,
  calculateRowsPerSecond,
  calculateProgressPercent
};
