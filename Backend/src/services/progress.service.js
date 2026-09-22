/**
 * Progress Service for tracking upload progress (Step 3)
 * Provides real-time upload progress data for Member 3 UI
 */

// Store active upload progress (in-memory for now)
const uploadProgress = new Map();

/**
 * Initialize progress tracking for an upload
 * @param {string} datasetId - Dataset ID
 * @param {Object} info - Initial info (filename, totalSize)
 */
export function initializeProgress(datasetId, info) {
  const progress = {
    datasetId,
    filename: info.filename,
    totalSize: info.totalSize || 0,
    bytesUploaded: 0,
    percentage: 0,
    speed: 0, // bytes per second
    status: 'uploading',
    startTime: Date.now(),
    lastUpdate: Date.now(),
    lastBytes: 0
  };

  uploadProgress.set(datasetId, progress);
  return progress;
}

/**
 * Update progress for an upload
 * @param {string} datasetId - Dataset ID
 * @param {number} bytesUploaded - Current bytes uploaded
 */
export function updateProgress(datasetId, bytesUploaded) {
  const progress = uploadProgress.get(datasetId);
  if (!progress) {
    return null;
  }

  const now = Date.now();
  const timeDiff = (now - progress.lastUpdate) / 1000; // seconds
  const bytesDiff = bytesUploaded - progress.lastBytes;

  // Calculate speed (bytes per second)
  if (timeDiff > 0) {
    progress.speed = bytesDiff / timeDiff;
  }

  progress.bytesUploaded = bytesUploaded;
  progress.lastBytes = bytesUploaded;
  progress.lastUpdate = now;

  // Calculate percentage
  if (progress.totalSize > 0) {
    progress.percentage = Math.round((bytesUploaded / progress.totalSize) * 100);
  }

  uploadProgress.set(datasetId, progress);
  return progress;
}

/**
 * Complete progress tracking
 * @param {string} datasetId - Dataset ID
 * @param {string} status - Final status ('completed' or 'failed')
 */
export function completeProgress(datasetId, status = 'completed') {
  const progress = uploadProgress.get(datasetId);
  if (!progress) {
    return null;
  }

  progress.status = status;
  progress.percentage = status === 'completed' ? 100 : progress.percentage;
  
  // Calculate average speed
  const totalDuration = (Date.now() - progress.startTime) / 1000;
  if (totalDuration > 0) {
    progress.avgSpeed = progress.bytesUploaded / totalDuration;
  }

  uploadProgress.set(datasetId, progress);
  return progress;
}

/**
 * Get progress for a dataset
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Progress data or null
 */
export function getProgress(datasetId) {
  const progress = uploadProgress.get(datasetId);
  if (!progress) {
    return null;
  }

  return {
    datasetId: progress.datasetId,
    filename: progress.filename,
    fileSize: progress.totalSize,
    bytesUploaded: progress.bytesUploaded,
    percentage: progress.percentage,
    speed: Math.round(progress.speed),
    speedMB: (progress.speed / (1024 * 1024)).toFixed(2),
    status: progress.status,
    elapsedTime: Math.round((Date.now() - progress.startTime) / 1000)
  };
}

/**
 * Remove progress tracking data
 * @param {string} datasetId - Dataset ID
 */
export function removeProgress(datasetId) {
  uploadProgress.delete(datasetId);
}

/**
 * Get all active uploads
 * @returns {Array} - Array of progress data
 */
export function getAllActiveUploads() {
  return Array.from(uploadProgress.values()).map(p => ({
    datasetId: p.datasetId,
    filename: p.filename,
    percentage: p.percentage,
    status: p.status
  }));
}
