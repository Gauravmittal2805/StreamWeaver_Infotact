import fs from 'fs';
import { pipeline } from 'stream/promises';

/**
 * Create a file read stream with error handling
 * @param {string} filePath - Path to file
 * @param {Object} options - Stream options
 * @returns {fs.ReadStream} - Read stream
 */
export function createFileReadStream(filePath, options = {}) {
  const defaultOptions = {
    highWaterMark: 64 * 1024, // 64KB chunks (good balance for large files)
    encoding: null, // Binary mode
    ...options
  };

  return fs.createReadStream(filePath, defaultOptions);
}

/**
 * Create a file write stream with error handling
 * @param {string} filePath - Path to file
 * @param {Object} options - Stream options
 * @returns {fs.WriteStream} - Write stream
 */
export function createFileWriteStream(filePath, options = {}) {
  const defaultOptions = {
    highWaterMark: 64 * 1024, // 64KB chunks
    encoding: null, // Binary mode
    ...options
  };

  return fs.createWriteStream(filePath, defaultOptions);
}

/**
 * Safely pipe streams with automatic error handling and cleanup
 * @param {Array<Stream>} streams - Array of streams to pipe
 * @returns {Promise<void>}
 */
export async function pipeStreams(...streams) {
  try {
    await pipeline(...streams);
  } catch (error) {
    // Cleanup: destroy all streams on error
    for (const stream of streams) {
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
    }
    throw error;
  }
}

/**
 * Monitor stream progress
 * @param {Stream} stream - Stream to monitor
 * @param {Function} onProgress - Progress callback (bytesProcessed)
 * @returns {Stream} - Same stream with progress monitoring
 */
export function monitorStreamProgress(stream, onProgress) {
  let bytesProcessed = 0;

  stream.on('data', (chunk) => {
    bytesProcessed += chunk.length;
    if (typeof onProgress === 'function') {
      onProgress(bytesProcessed);
    }
  });

  return stream;
}

/**
 * Handle stream errors with cleanup
 * @param {Stream} stream - Stream to handle
 * @param {string} streamName - Name for logging
 * @param {Function} onError - Error callback
 * @param {Function} cleanup - Cleanup function
 */
export function handleStreamError(stream, streamName, onError, cleanup) {
  stream.on('error', (error) => {
    console.error(`❌ ${streamName} error:`, error.message);
    
    if (typeof cleanup === 'function') {
      cleanup();
    }

    if (typeof onError === 'function') {
      onError(error);
    }
  });
}

/**
 * Create a transform stream that respects backpressure
 * @param {Function} transformFn - Transform function (chunk, encoding, callback)
 * @returns {Transform} - Transform stream
 */
export async function createBackpressureAwareTransform(transformFn) {
  const { Transform } = await import('stream');
  
  return new Transform({
    highWaterMark: 64 * 1024,
    transform: transformFn
  });
}

/**
 * Measure stream throughput
 * @param {Stream} stream - Stream to measure
 * @param {Function} onMetrics - Metrics callback ({ bytesProcessed, duration, throughput })
 * @returns {Stream} - Same stream with metrics
 */
export function measureStreamThroughput(stream, onMetrics) {
  let bytesProcessed = 0;
  const startTime = Date.now();

  stream.on('data', (chunk) => {
    bytesProcessed += chunk.length;
  });

  stream.on('end', () => {
    const duration = (Date.now() - startTime) / 1000; // seconds
    const throughput = bytesProcessed / duration; // bytes per second

    if (typeof onMetrics === 'function') {
      onMetrics({
        bytesProcessed,
        duration,
        throughput,
        throughputMB: throughput / (1024 * 1024)
      });
    }
  });

  return stream;
}

/**
 * Verify file stream is readable
 * @param {string} filePath - Path to file
 * @returns {Promise<boolean>} - True if readable
 */
export async function verifyFileReadable(filePath) {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(filePath);
    
    stream.on('readable', () => {
      stream.destroy();
      resolve(true);
    });

    stream.on('error', () => {
      resolve(false);
    });
  });
}
