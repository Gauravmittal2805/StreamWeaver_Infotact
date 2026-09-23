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
import { 
  initializeProgress, 
  updateProgress, 
  completeProgress,
  getProgress as getUploadProgress
} from './progress.service.js';
import { verifyFileIntegrity } from './integrity.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * Upload dataset using streaming approach with proper backpressure handling
 * Enhanced with progress tracking, integrity checks, and interrupt handling (Steps 2-7)
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Dataset metadata with progress info
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
    let uploadStartTime = Date.now();
    let uploadedBytes = 0;
    let writeStreamClosed = false;

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

      // Step 6: Create initial metadata with 'uploading' status (NOT uploaded yet)
      const initialMetadata = createDatasetMetadata({
        id: datasetId,
        originalName: filename,
        storedName: storedFilename,
        format: validation.format,
        path: filePath,
        status: DatasetStatus.UPLOADING // Stays uploading until file complete
      });

      // Step 3: Initialize progress tracking for Member 3
      initializeProgress(datasetId, {
        filename: filename,
        totalSize: 0 // Will be updated as we receive data
      });

      console.log(`📤 Starting upload: ${filename} → ${storedFilename}`);

      // Create write stream with backpressure support
      const writeStream = createFileWriteStream(filePath);
      
      let lastLoggedMB = 0;
      let lastProgressUpdate = Date.now();

      // Step 3 & 5: Track upload progress with backpressure awareness and interrupt detection
      file.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        const currentMB = Math.floor(uploadedBytes / (1024 * 1024));
        
        // Update progress every 100ms for smooth UI updates
        const now = Date.now();
        if (now - lastProgressUpdate >= 100) {
          updateProgress(datasetId, uploadedBytes);
          lastProgressUpdate = now;
        }
        
        // Log memory usage every 10MB
        if (currentMB >= lastLoggedMB + 10) {
          const memUsage = process.memoryUsage();
          console.log(`📊 Memory - Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB | Uploaded: ${currentMB} MB`);
          lastLoggedMB = currentMB;
        }
      });

      // Step 2: Pipe with automatic backpressure handling (proper Node.js streams)
      file.pipe(writeStream);

      // Step 6: Only mark as 'uploaded' AFTER file completely written
      writeStream.on('finish', async () => {
        // Prevent race condition - check if file was already cleaned up
        if (!fs.existsSync(filePath)) {
          console.log(`⚠️  File was cleaned up before finish event (upload cancelled)`);
          return; // Don't try to process - cleanup already handled
        }

        try {
          const stats = fs.statSync(filePath);
          
          // Final progress update
          updateProgress(datasetId, stats.size);
          
          // Step 7: File integrity checks
          console.log(`🔍 Verifying file integrity for ${storedFilename}...`);
          const integrityCheck = verifyFileIntegrity({
            filePath: filePath,
            expectedSize: null, // We don't know expected size from client
            uploadedBytes: uploadedBytes,
            format: validation.format
          });

          if (!integrityCheck.valid) {
            console.error(`❌ Integrity check failed: ${integrityCheck.errors.join(', ')}`);
            completeProgress(datasetId, 'failed');
            cleanupFailedUpload(datasetId, filePath, integrityCheck.errors.join('; '));
            return reject(new Error(`File integrity check failed: ${integrityCheck.errors[0]}`));
          }

          console.log(`✅ Integrity check passed`);

          // Calculate upload metrics
          const uploadDuration = (Date.now() - uploadStartTime) / 1000;
          const uploadSpeed = stats.size / uploadDuration; // bytes per second

          // Step 6: NOW mark as 'uploaded' - after file is complete and verified
          datasetMetadata = updateDatasetStatus(datasetId, DatasetStatus.UPLOADED, {
            size: stats.size,
            uploadDuration: uploadDuration,
            uploadSpeed: uploadSpeed
          });

          // Complete progress tracking
          completeProgress(datasetId, 'completed');

          fileProcessed = true;
          
          const finalMemUsage = process.memoryUsage();
          console.log(`✅ Upload complete: ${storedFilename}`);
          console.log(`   Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
          console.log(`   Duration: ${uploadDuration.toFixed(2)}s`);
          console.log(`   Speed: ${(uploadSpeed / (1024 * 1024)).toFixed(2)} MB/s`);
          console.log(`   Final Memory - Heap: ${(finalMemUsage.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(finalMemUsage.rss / 1024 / 1024).toFixed(2)} MB`);
          
          // Resolve the promise with the dataset metadata
          resolve(datasetMetadata);
        } catch (error) {
          console.error('❌ Error finalizing upload:', error);
          completeProgress(datasetId, 'failed');
          // Only cleanup if file still exists (might have been cleaned up already)
          if (fs.existsSync(filePath)) {
            cleanupFailedUpload(datasetId, filePath, error.message);
          }
          reject(new Error('Failed to finalize upload'));
        }
      });

      // Step 5: Handle write stream errors (interrupted uploads)
      writeStream.on('error', (error) => {
        console.error('❌ Write stream error:', error.message);
        completeProgress(datasetId, 'failed');
        cleanupFailedUpload(datasetId, filePath, `Write error: ${error.message}`);
        reject(new Error(`Failed to write file: ${error.message}`));
      });

      // Step 5: Handle file stream errors (network issues, cancellation)
      file.on('error', (error) => {
        console.error('❌ File stream error:', error.message);
        if (!writeStreamClosed) {
          writeStream.destroy();
        }
        completeProgress(datasetId, 'failed');
        cleanupFailedUpload(datasetId, filePath, `Stream error: ${error.message}`);
        reject(new Error(`Failed to process file stream: ${error.message}`));
      });

      // Handle file size limit exceeded
      file.on('limit', () => {
        console.error('❌ File size limit exceeded');
        writeStream.destroy();
        completeProgress(datasetId, 'failed');
        cleanupFailedUpload(datasetId, filePath, 'File size limit exceeded');
        reject(new Error('File size exceeds maximum allowed limit (10GB)'));
      });
    });

    // Busboy 'finish' just means the request parsing is done
    // The actual file writing may still be in progress
    // So we don't resolve/reject here - let writeStream 'finish' handle it
    let busboyFinished = false;
    busboyInstance.on('finish', () => {
      busboyFinished = true;
      console.log(`📦 Busboy finished parsing request`);
      
      // If no file was detected at all, reject after a short delay
      setTimeout(() => {
        if (!fileProcessed && !currentDatasetId) {
          reject(new Error('No file was uploaded'));
        }
      }, 100);
    });

    busboyInstance.on('error', (error) => {
      console.error('❌ Busboy error:', error.message);
      if (currentDatasetId && currentFilePath) {
        completeProgress(currentDatasetId, 'failed');
        cleanupFailedUpload(currentDatasetId, currentFilePath, `Parse error: ${error.message}`);
      }
      reject(new Error(`Failed to parse upload: ${error.message}`));
    });

    // Step 5: Handle request errors (browser closed, network disconnected)
    req.on('error', (error) => {
      console.error('❌ Request error (upload interrupted):', error.message);
      if (currentDatasetId && currentFilePath) {
        completeProgress(currentDatasetId, 'failed');
        cleanupFailedUpload(currentDatasetId, currentFilePath, `Upload interrupted: ${error.message}`);
      }
      reject(new Error(`Upload interrupted: ${error.message}`));
    });

    // Step 5: Handle request abort/close (user cancelled)
    // Note: Don't cleanup immediately on 'close' - busboy 'finish' will handle it
    // The 'close' event fires when request ends, but writeStream may still be processing
    req.on('close', () => {
      // Just log - cleanup will happen in busboy 'finish' if file wasn't processed
      if (!fileProcessed && currentDatasetId) {
        console.log(`ℹ️  Request closed for ${currentDatasetId} (normal for completed uploads)`);
      }
    });

    // Step 2: Pipe the request to busboy (automatic backpressure handling)
    req.pipe(busboyInstance);
  });
}

/**
 * Clean up failed upload
 * @param {string} datasetId - Dataset ID
 * @param {string} filePath - File path
 * @param {string} errorMessage - Error message
 */
function cleanupFailedUpload(datasetId, filePath, errorMessage = 'Upload failed') {
  try {
    // Remove partial file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🧹 Cleaned up partial file: ${path.basename(filePath)}`);
    }
    
    // Update metadata to failed status
    const metadata = findDatasetById(datasetId);
    if (metadata) {
      updateDatasetStatus(datasetId, DatasetStatus.FAILED, {
        error: errorMessage
      });
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error.message);
  }
}

/**
 * Get upload progress for a dataset (Step 13 - for Member 3)
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Progress data or null
 */
export function getProgress(datasetId) {
  return getUploadProgress(datasetId);
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

/**
 * Get streaming limited rows preview (Step 11 Member 1 Coordination)
 * @param {string} datasetId - Dataset ID
 * @param {number} limit - Row limit for preview (default 1000)
 * @returns {Promise<Object>}
 */
export async function getDatasetPreview(datasetId, limit = 1000) {
  const metadata = findDatasetById(datasetId);
  if (!metadata) {
    throw new Error('Dataset not found');
  }
  if (!fs.existsSync(metadata.path)) {
    throw new Error('Dataset file not found on disk');
  }

  const { default: csv } = await import('csv-parser');
  const { default: readline } = await import('readline');

  return new Promise((resolve, reject) => {
    const rows = [];
    let columns = [];
    const readStream = fs.createReadStream(metadata.path, { encoding: 'utf8' });

    if (metadata.format === 'csv') {
      const csvStream = readStream.pipe(csv());
      csvStream.on('headers', (headers) => {
        columns = headers;
      });
      csvStream.on('data', (data) => {
        if (rows.length < limit) {
          rows.push(data);
          if (columns.length === 0) {
            columns = Object.keys(data);
          }
        } else {
          readStream.destroy();
          resolve({
            datasetId,
            format: 'csv',
            filename: metadata.originalName,
            totalRecordsEstimated: 5000000,
            previewLimit: limit,
            columns,
            rows
          });
        }
      });
      csvStream.on('end', () => {
        resolve({
          datasetId,
          format: 'csv',
          filename: metadata.originalName,
          totalRecordsEstimated: rows.length,
          previewLimit: limit,
          columns,
          rows
        });
      });
      csvStream.on('error', (err) => {
        readStream.destroy();
        reject(err);
      });
    } else {
      const rl = readline.createInterface({
        input: readStream,
        crlfDelay: Infinity
      });
      rl.on('line', (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed === '[' || trimmed === ']' || trimmed === ',') return;
        const cleanLine = trimmed.endsWith(',') ? trimmed.slice(0, -1) : trimmed;
        try {
          const parsed = JSON.parse(cleanLine);
          if (rows.length < limit) {
            rows.push(parsed);
            if (columns.length === 0) {
              columns = Object.keys(parsed);
            }
          } else {
            rl.close();
            readStream.destroy();
          }
        } catch {
          // ignore non-json line fragments
        }
      });
      rl.on('close', () => {
        resolve({
          datasetId,
          format: 'json',
          filename: metadata.originalName,
          totalRecordsEstimated: rows.length < limit ? rows.length : 5000000,
          previewLimit: limit,
          columns,
          rows
        });
      });
      rl.on('error', (err) => {
        readStream.destroy();
        reject(err);
      });
    }
  });
}

