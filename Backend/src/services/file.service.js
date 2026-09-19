const fs = require("fs");
const path = require("path");
const { Readable } = require("stream");
const { getDB } = require("../config/db");

const DATASETS_COLLECTION = "datasets";

// In-memory fallback registry for datasets (e.g. testing or before DB sync)
const memoryRegistry = new Map();

/**
 * Register dataset metadata and source (used by Member 1 upload handler & test harness)
 * @param {string} datasetId 
 * @param {object} metadata - { format, originalName, size, totalRows, filePath, streamFactory }
 */
async function registerDataset(datasetId, metadata) {
  const datasetRecord = {
    datasetId,
    format: metadata.format ? metadata.format.toLowerCase() : "csv",
    originalName: metadata.originalName || `${datasetId}.${metadata.format || "csv"}`,
    size: metadata.size || 0,
    totalRows: metadata.totalRows || null,
    filePath: metadata.filePath || null,
    createdAt: new Date()
  };

  // Cache in-memory with optional streamFactory
  memoryRegistry.set(datasetId, {
    ...datasetRecord,
    streamFactory: metadata.streamFactory || null
  });

  try {
    const db = getDB();
    await db.collection(DATASETS_COLLECTION).updateOne(
      { datasetId },
      { $set: datasetRecord },
      { upsert: true }
    );
  } catch (err) {
    // If DB is not connected or during unit tests, memoryRegistry serves as fallback
  }

  return datasetRecord;
}

/**
 * Member 1 Contract: Dataset Metadata Lookup
 * @param {string} datasetId
 * @returns {Promise<object>} metadata { datasetId, format, originalName, size, totalRows }
 */
async function getDatasetMetadata(datasetId) {
  if (memoryRegistry.has(datasetId)) {
    const entry = memoryRegistry.get(datasetId);
    return {
      datasetId: entry.datasetId,
      format: entry.format,
      originalName: entry.originalName,
      size: entry.size,
      totalRows: entry.totalRows
    };
  }

  try {
    const db = getDB();
    const dataset = await db.collection(DATASETS_COLLECTION).findOne({ datasetId });
    if (dataset) {
      return {
        datasetId: dataset.datasetId,
        format: dataset.format,
        originalName: dataset.originalName,
        size: dataset.size,
        totalRows: dataset.totalRows
      };
    }
  } catch (err) {
    // DB not available or lookup failed
  }

  throw new Error(`Dataset not found: ${datasetId}`);
}

/**
 * Member 1 Contract: File Service Read Stream
 * Returns a Readable stream for the given datasetId.
 * Downstream ETL components must never directly access physical file paths or storage layout.
 *
 * @param {string} datasetId
 * @returns {Promise<Readable>}
 */
async function getReadStream(datasetId) {
  const entry = memoryRegistry.get(datasetId);
  if (entry) {
    if (typeof entry.streamFactory === "function") {
      return entry.streamFactory();
    }
    if (entry.filePath && fs.existsSync(entry.filePath)) {
      return fs.createReadStream(entry.filePath);
    }
  }

  try {
    const db = getDB();
    const dataset = await db.collection(DATASETS_COLLECTION).findOne({ datasetId });
    if (dataset && dataset.filePath && fs.existsSync(dataset.filePath)) {
      return fs.createReadStream(dataset.filePath);
    }
  } catch (err) {
    // Fall through to error
  }

  throw new Error(`Cannot open read stream: Dataset '${datasetId}' not found or file missing`);
}

module.exports = {
  getDatasetMetadata,
  getReadStream,
  registerDataset
};

