import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import busboy from 'busboy';
import { validateFileExtension, sanitizeFilename, generateDatasetId } from '../utils/file.validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// In-memory metadata store (later this will be a database)
const datasetsMetadata = new Map();

/**
 * Upload dataset using streaming approach
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} - Dataset metadata
 */
export async function uploadDataset(req) {
  return new Promise((resolve, reject) => {
    const busboyInstance = busboy({ headers: req.headers });
    
    let fileProcessed = false;
    let datasetMetadata = null;

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
      const sanitized = sanitizeFilename(filename);
      const fileExtension = path.extname(sanitized);
      const storedFilename = `${datasetId}${fileExtension}`;
      const filePath = path.join(UPLOAD_DIR, storedFilename);

      // Create write stream
      const writeStream = fs.createWriteStream(filePath);
      
      let uploadedBytes = 0;

      // Track upload progress
      file.on('data', (chunk) => {
        uploadedBytes += chunk.length;
        // Log memory usage periodically (every 10MB)
        if (uploadedBytes % (10 * 1024 * 1024) < chunk.length) {
          const memUsage = process.memoryUsage();
          console.log(`📊 Memory Usage - Heap: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB, Uploaded: ${(uploadedBytes / 1024 / 1024).toFixed(2)} MB`);
        }
      });

      // Pipe file stream to write stream
      file.pipe(writeStream);

      writeStream.on('finish', () => {
        const stats = fs.statSync(filePath);
        
        // Create dataset metadata
        datasetMetadata = {
          id: datasetId,
          originalName: filename,
          storedName: storedFilename,
          format: validation.format,
          size: stats.size,
          status: 'uploaded',
          uploadedAt: new Date().toISOString(),
          path: filePath
        };

        // Store metadata (in-memory for now)
        datasetsMetadata.set(datasetId, datasetMetadata);

        fileProcessed = true;
        console.log(`✅ File uploaded successfully: ${storedFilename} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
      });

      writeStream.on('error', (error) => {
        console.error('❌ Write stream error:', error);
        // Clean up partial file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        reject(new Error('Failed to write file to disk'));
      });

      file.on('error', (error) => {
        console.error('❌ File stream error:', error);
        writeStream.destroy();
        reject(new Error('Failed to process file stream'));
      });
    });

    busboyInstance.on('finish', () => {
      if (!fileProcessed) {
        return reject(new Error('No file was uploaded'));
      }
      resolve(datasetMetadata);
    });

    busboyInstance.on('error', (error) => {
      console.error('❌ Busboy error:', error);
      reject(new Error('Failed to parse multipart form data'));
    });

    // Pipe the request to busboy
    req.pipe(busboyInstance);
  });
}

/**
 * Get dataset metadata by ID
 * @param {string} datasetId - Dataset ID
 * @returns {Object|null} - Dataset metadata or null
 */
export function getDataset(datasetId) {
  return datasetsMetadata.get(datasetId) || null;
}

/**
 * Get read stream for a dataset
 * @param {string} datasetId - Dataset ID
 * @returns {fs.ReadStream|null} - Read stream or null
 */
export function getReadStream(datasetId) {
  const metadata = datasetsMetadata.get(datasetId);
  if (!metadata) {
    return null;
  }

  if (!fs.existsSync(metadata.path)) {
    return null;
  }

  return fs.createReadStream(metadata.path);
}

/**
 * Delete dataset
 * @param {string} datasetId - Dataset ID
 * @returns {boolean} - Success status
 */
export function deleteDataset(datasetId) {
  const metadata = datasetsMetadata.get(datasetId);
  if (!metadata) {
    return false;
  }

  try {
    if (fs.existsSync(metadata.path)) {
      fs.unlinkSync(metadata.path);
    }
    datasetsMetadata.delete(datasetId);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete dataset:', error);
    return false;
  }
}

/**
 * Get all datasets
 * @returns {Array} - Array of dataset metadata
 */
export function getAllDatasets() {
  return Array.from(datasetsMetadata.values());
}
