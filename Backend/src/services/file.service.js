import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import busboy from 'busboy';
import { validateFileExtension, sanitizeFilename, generateDatasetId } from '../utils/file.validator.js';
import { 
  createDatasetMetadata, 
  updateDatasetStatus, 
  findDatasetById,
  deleteDatasetMetadata,
  datasetFileExists,
  validateDatasetForProcessing,
  getAllDatasets as getAllDatasetsMetadata,
  DatasetStatus
} from './dataset.service.js';
import { 
  createFileReadStream, 
  createFileWriteStream,
  handleStreamError 
} from '../utils/stream.utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Upload dataset using streaming approach with proper backpressure handling
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Dataset metadata
 */
export async function uploadDataset(req) {
  return new Promise((resolve, reject) => {
    const busboyInstance = busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024 * 1024 // 10GB max file size
      }
    });
    
    let fileProcessed = false;
    let datasetMetadata = null;
    let currentDatasetId = null;
    let currentFilePath = null;

    busboyInstance.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      
      // Validate file extension
      const validation = validateFileExtension(filename);
      if (!validation.valid) {
        file.resume(); // Drain the stream
        return reject(new Error(validation.error));
      }

      // Generate unique dataset ID and storage filename
      const datasetId = generateDatasetId();
      currentDatasetId = datasetId;
      const sanitized = sanitizeFilename(filename);
      const fileExtension = path.extname(sanitized);
      const storedFilename = `${datasetId}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, storedFilename);
      currentFilePath = filePath;

      // Create initial metadata with 'uploading' status
      const initialMetadata = createDatasetMetadata({
        id: datasetId,
        originalName: filename,
        storedName: storedFilename,
        format: validation.format,
        path: filePath,
        status: DatasetStatus.UPLOADING
      });

      console.log(`📤 Starting upload: ${filename} → ${storedFilename}`);

      // Create write stream with backpressure support
      const writeStream = createFileWriteStream(filePath);
      
      let uploadedBytes = 0;
      let lastLoggedMB = 0;

      // Track upload progress with backpressure awareness
      file.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const currentMB = Math.floor(uploadedBytes / (1024 * 1024));
        
        // Log memory usage every 10MB
        if (currentMB >= lastLoggedMB + 10) {
          const memUsage = process.memoryUsage();
          console.log(`📊 Memory - Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB | Uploaded: ${currentMB} MB`);
          lastLoggedMB = currentMB;
        }
      });

      // Pipe with automatic backpressure handling
      file.pipe(writeStream);

      writeStream.on('finish', () => {
        try {
          const stats = fs.statSync(filePath);
          
          // Update metadata to 'uploaded' status
          datasetMetadata = updateDatasetStatus(datasetId, DatasetStatus.UPLOADED, {
            size: stats.size
          });

          fileProcessed = true;
          
          const finalMemUsage = process.memoryUsage();
          console.log(`✅ Upload complete: ${storedFilename}`);
          console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   Final Memory - Heap: ${(finalMemUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(finalMemUsage.rss / 1024 / 1024).toFixed(2)} MB`);
        } catch (error) {
          console.error('❌ Error finalizing upload:', error);
          cleanupFailedUpload(datasetId, filePath);
          reject(new Error('Failed to finalize upload'));
        }
      });

      writeStream.on('error', (error) => {
        console.error('❌ Write stream error:', error.message);
        cleanupFailedUpload(datasetId, filePath);
        reject(new Error(`Failed to write file: ${error.message}`));
      });

      file.on('error', (error) => {
        console.error('❌ File stream error:', error.message);
        writeStream.destroy();
        cleanupFailedUpload(datasetId, filePath);
        reject(new Error(`Failed to process file stream: ${error.message}`));
      });

      file.on('limit', () => {
        console.error('❌ File size limit exceeded');
        writeStream.destroy();
        cleanupFailedUpload(datasetId, filePath);
        reject(new Error('File size exceeds maximum allowed limit (10GB)'));
      });
    });

    busboyInstance.on('finish', () => {
      if (!fileProcessed) {
        return reject(new Error('No file was uploaded'));
      }
      resolve(datasetMetadata);
    });

    busboyInstance.on('error', (error) => {
      console.error('❌ Busboy error:', error.message);
      if (currentDatasetId && currentFilePath) {
        cleanupFailedUpload(currentDatasetId, currentFilePath);
      }
      reject(new Error(`Failed to parse upload: ${error.message}`));
    });

    // Handle request errors
    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      if (currentDatasetId && currentFilePath) {
        cleanupFailedUpload(currentDatasetId, currentFilePath);
      }
      reject(new Error(`Upload interrupted: ${error.message}`));
    });

    // Pipe the request to busboy (automatic backpressure handling)
    req.pipe(busboyInstance);
  });
}

/**
 * Clean up failed upload
 * @param {string} datasetId - Dataset ID
 * @param {string} filePath - File path
 */
function cleanupFailedUpload(datasetId, filePath) {
  try {
    // Remove partial file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up partial file: ${path.basename(filePath)}`);
    }
    
    // Update metadata to failed status or remove it
    const metadata = findDatasetById(datasetId);
    if (metadata) {
      updateDatasetStatus(datasetId, DatasetStatus.FAILED, {
        error: 'Upload failed and was cleaned up'
      });
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

/**
 * Get dataset metadata by ID
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Dataset metadata or null
 */
export function getDataset(datasetId) {
  return findDatasetById(datasetId);
}

/**
 * Get read stream for a dataset (Member 1 → Member 2 interface)
 * This is the primary interface for Member 2 to access uploaded files
 * 
 * @param {string} datasetId - Dataset ID
 * @returns {Object} - { success: boolean, stream: ReadStream|null, error: string|null, metadata: Object|null }
 */
export function getReadStream(datasetId) {
  // Validate dataset exists and is ready
  const validation = validateDatasetForProcessing(datasetId);
  if (!validation.valid) {
    return {
      success: false,
      stream: null,
      error: validation.reason,
      metadata: null
    };
  }

  const metadata = findDatasetById(datasetId);
  
  // Double-check file exists
  if (!datasetFileExists(datasetId)) {
    return {
      success: false,
      stream: null,
      error: 'Dataset file not found on disk',
      metadata: null
    };
  }

  try {
    // Create read stream with optimized settings for large files
    const stream = createFileReadStream(metadata.path, {
      highWaterMark: 64 * 1024 // 64KB chunks for good throughput
    });

    // Add error handling to the stream
    stream.on('error', (error) => {
      console.error(`❌ Error reading dataset ${datasetId}:`, error.message);
    });

    console.log(`📖 Read stream created for dataset: ${datasetId} (${metadata.originalName})`);

    return {
      success: true,
      stream: stream,
      error: null,
      metadata: {
        id: metadata.id,
        filename: metadata.originalName,
        format: metadata.format,
        size: metadata.size
      }
    };
  } catch (error) {
    console.error(`❌ Failed to create read stream for ${datasetId}:`, error.message);
    return {
      success: false,
      stream: null,
      error: `Failed to create read stream: ${error.message}`,
      metadata: null
    };
  }
}

/**
 * Delete dataset (file + metadata)
 * @param {string} datasetId - Dataset ID
 * @returns {boolean} - Success status
 */
export function deleteDataset(datasetId) {
  const metadata = findDatasetById(datasetId);
  if (!metadata) {
    return false;
  }

  try {
    // Delete physical file
    if (fs.existsSync(metadata.path)) {
      fs.unlinkSync(metadata.path);
      console.log(`🗑️  Deleted file: ${metadata.storedName}`);
    }
    
    // Delete metadata
    deleteDatasetMetadata(datasetId);
    console.log(`🗑️  Deleted metadata for: ${datasetId}`);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed to delete dataset ${datasetId}:`, error.message);
    return false;
  }
}

/**
 * Get all datasets
 * @returns {Array} - Array of dataset metadata
 */
export function getAllDatasets() {
  return getAllDatasetsMetadata();
}

/**
 * Check if dataset is ready for processing
 * @param {string} datasetId - Dataset ID
 * @returns {Object} - { ready: boolean, reason: string|null }
 */
export function isDatasetReady(datasetId) {
  const validation = validateDatasetForProcessing(datasetId);
  return {
    ready: validation.valid,
    reason: validation.reason
  };
}
