import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// In-memory metadata store (will be replaced with MongoDB)
const datasetsMetadata = new Map();

/**
 * Dataset status enum
 */
export const DatasetStatus = {
  UPLOADING: 'uploading',
  UPLOADED: 'uploaded',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

/**
 * Create dataset metadata
 * @param {Object} metadata - Dataset metadata
 * @returns {Object} - Created metadata
 */
export function createDatasetMetadata(metadata) {
  const dataset = {
    id: metadata.id,
    originalName: metadata.originalName,
    storedName: metadata.storedName,
    format: metadata.format,
    size: metadata.size || 0,
    status: metadata.status || DatasetStatus.UPLOADING,
    processingStatus: null,
    uploadedAt: metadata.uploadedAt || new Date().toISOString(),
    processedAt: null,
    path: metadata.path,
    error: null
  };

  datasetsMetadata.set(dataset.id, dataset);
  return dataset;
}

/**
 * Find dataset by ID
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Dataset metadata or null
 */
export function findDatasetById(datasetId) {
  return datasetsMetadata.get(datasetId) || null;
}

/**
 * Update dataset status
 * @param {string} datasetId - Dataset ID
 * @param {string} status - New status
 * @param {Object} additionalData - Additional data to update
 * @returns {Object|null} - Updated dataset or null
 */
export function updateDatasetStatus(datasetId, status, additionalData = {}) {
  const dataset = datasetsMetadata.get(datasetId);
  if (!dataset) {
    return null;
  }

  dataset.status = status;
  
  if (status === DatasetStatus.PROCESSING) {
    dataset.processingStatus = 'in_progress';
  } else if (status === DatasetStatus.COMPLETED) {
    dataset.processingStatus = 'completed';
    dataset.processedAt = new Date().toISOString();
  } else if (status === DatasetStatus.FAILED) {
    dataset.processingStatus = 'failed';
    dataset.error = additionalData.error || 'Unknown error';
  }

  // Merge additional data
  Object.assign(dataset, additionalData);

  datasetsMetadata.set(datasetId, dataset);
  return dataset;
}

/**
 * Get dataset information (safe for API responses)
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Dataset info or null
 */
export function getDatasetInfo(datasetId) {
  const dataset = datasetsMetadata.get(datasetId);
  if (!dataset) {
    return null;
  }

  return {
    id: dataset.id,
    filename: dataset.originalName,
    format: dataset.format,
    size: dataset.size,
    status: dataset.status,
    processingStatus: dataset.processingStatus,
    uploadedAt: dataset.uploadedAt,
    processedAt: dataset.processedAt,
    error: dataset.error
  };
}

/**
 * Delete dataset metadata
 * @param {string} datasetId - Dataset ID
 * @returns {boolean} - Success status
 */
export function deleteDatasetMetadata(datasetId) {
  return datasetsMetadata.delete(datasetId);
}

/**
 * Check if dataset exists
 * @param {string} datasetId - Dataset ID
 * @returns {boolean} - Existence status
 */
export function datasetExists(datasetId) {
  return datasetsMetadata.has(datasetId);
}

/**
 * Check if dataset file exists on disk
 * @param {string} datasetId - Dataset ID
 * @returns {boolean} - File existence status
 */
export function datasetFileExists(datasetId) {
  const dataset = datasetsMetadata.get(datasetId);
  if (!dataset) {
    return false;
  }

  return fs.existsSync(dataset.path);
}

/**
 * Validate dataset is ready for processing
 * @param {string} datasetId - Dataset ID
 * @returns {Object} - { valid: boolean, reason: string|null }
 */
export function validateDatasetForProcessing(datasetId) {
  if (!datasetExists(datasetId)) {
    return { valid: false, reason: 'Dataset does not exist' };
  }

  const dataset = datasetsMetadata.get(datasetId);

  if (dataset.status === DatasetStatus.UPLOADING) {
    return { valid: false, reason: 'Dataset is still uploading' };
  }

  if (dataset.status === DatasetStatus.PROCESSING) {
    return { valid: false, reason: 'Dataset is already being processed' };
  }

  if (!datasetFileExists(datasetId)) {
    return { valid: false, reason: 'Dataset file not found on disk' };
  }

  return { valid: true, reason: null };
}

/**
 * Get all datasets
 * @returns {Array} - Array of dataset metadata
 */
export function getAllDatasets() {
  return Array.from(datasetsMetadata.values());
}

/**
 * Get dataset file path
 * @param {string} datasetId - Dataset ID
 * @returns {string|null} - File path or null
 */
export function getDatasetFilePath(datasetId) {
  const dataset = datasetsMetadata.get(datasetId);
  return dataset ? dataset.path : null;
}
