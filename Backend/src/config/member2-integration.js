/**
 * Member 1 → Member 2 Integration Contract
 * 
 * This file documents the interface between Member 1 (File Upload) and Member 2 (ETL Processing)
 */

import { getReadStream } from '../services/file.service.js';
import { validateDatasetForProcessing } from '../services/dataset.service.js';

/**
 * MEMBER 2 INTERFACE
 * 
 * Member 2 should use this function to access uploaded datasets.
 * Member 2 does NOT need to know:
 * - Where files are stored
 * - How files are named
 * - File system paths
 * - Upload implementation details
 * 
 * Member 2 only needs:
 * - datasetId (provided by frontend or API)
 * - This function to get a readable stream
 */

/**
 * Get a readable stream for a dataset (Primary Member 2 Interface)
 * 
 * @param {string} datasetId - Dataset ID from upload
 * @returns {Object} - Result object with stream and metadata
 * 
 * @example
 * const result = getDatasetStream('dataset_lq3f8x_a7k9m2');
 * 
 * if (result.success) {
 *   const stream = result.stream;
 *   const format = result.metadata.format; // 'csv' or 'json'
 *   
 *   // Member 2 can now:
 *   // 1. Pipe to CSV parser if format === 'csv'
 *   // 2. Pipe to JSON parser if format === 'json'
 *   // 3. Process data row by row
 *   // 4. Apply transformations
 *   // 5. Execute mapping logic
 *   // 6. Bulk insert into MongoDB
 * } else {
 *   console.error('Cannot process:', result.error);
 * }
 */
export function getDatasetStream(datasetId) {
  return getReadStream(datasetId);
}

/**
 * Check if dataset is ready for processing
 * 
 * Member 2 should call this BEFORE attempting to process a dataset.
 * This prevents wasted ETL jobs on invalid/missing datasets.
 * 
 * @param {string} datasetId - Dataset ID
 * @returns {Object} - { valid: boolean, reason: string|null }
 * 
 * @example
 * const check = checkDatasetReady('dataset_lq3f8x_a7k9m2');
 * 
 * if (check.valid) {
 *   // Proceed with ETL
 * } else {
 *   console.log('Cannot process:', check.reason);
 *   // Reasons could be:
 *   // - "Dataset does not exist"
 *   // - "Dataset is still uploading"
 *   // - "Dataset is already being processed"
 *   // - "Dataset file not found on disk"
 * }
 */
export function checkDatasetReady(datasetId) {
  return validateDatasetForProcessing(datasetId);
}

/**
 * MEMBER 2 RESPONSIBILITIES
 * 
 * Member 2 handles:
 * ✅ CSV/JSON parsing
 * ✅ Data transformation
 * ✅ Mapping logic execution
 * ✅ JavaScript evaluation (via isolated-vm)
 * ✅ MongoDB bulk insertion
 * ✅ Rule engine
 * ✅ Error handling during processing
 * ✅ Progress tracking
 * 
 * Member 1 provides:
 * ✅ File upload
 * ✅ File storage
 * ✅ Dataset ID generation
 * ✅ Read stream interface
 * ✅ File validation
 * ✅ Upload status management
 */

/**
 * EXAMPLE MEMBER 2 USAGE
 * 
 * // Step 1: Check if dataset is ready
 * const readyCheck = checkDatasetReady(datasetId);
 * if (!readyCheck.valid) {
 *   throw new Error(readyCheck.reason);
 * }
 * 
 * // Step 2: Get read stream
 * const result = getDatasetStream(datasetId);
 * if (!result.success) {
 *   throw new Error(result.error);
 * }
 * 
 * // Step 3: Determine parser based on format
 * const { stream, metadata } = result;
 * let parser;
 * 
 * if (metadata.format === 'csv') {
 *   parser = csvParser(); // Member 2's CSV parser
 * } else if (metadata.format === 'json') {
 *   parser = jsonParser(); // Member 2's JSON parser
 * }
 * 
 * // Step 4: Process data
 * stream
 *   .pipe(parser)
 *   .on('data', (row) => {
 *     // Member 2 processes each row:
 *     // 1. Apply transformations
 *     // 2. Execute mapping logic
 *     // 3. Validate
 *     // 4. Batch for MongoDB
 *   })
 *   .on('end', () => {
 *     // Member 2 finalizes:
 *     // 1. Flush remaining batches
 *     // 2. Update processing status
 *     // 3. Generate summary
 *   })
 *   .on('error', (error) => {
 *     // Member 2 handles errors
 *   });
 */

/**
 * STREAMING BEST PRACTICES FOR MEMBER 2
 * 
 * 1. NEVER buffer entire dataset in memory
 *    ❌ Bad: const allRows = await readAllRows(stream);
 *    ✅ Good: Process row by row with stream.on('data', ...)
 * 
 * 2. Respect backpressure
 *    ❌ Bad: Accumulate unlimited rows in array
 *    ✅ Good: Use batch size and pause/resume
 * 
 * 3. Use batch inserts for MongoDB
 *    ❌ Bad: Insert one document at a time
 *    ✅ Good: Accumulate 1000-5000 docs, then bulk insert
 * 
 * 4. Handle errors gracefully
 *    ❌ Bad: Let errors crash the process
 *    ✅ Good: Log errors, track failed rows, continue processing
 * 
 * 5. Update processing status
 *    - Mark dataset as 'processing' when starting
 *    - Mark as 'completed' when done
 *    - Mark as 'failed' on critical errors
 */

export default {
  getDatasetStream,
  checkDatasetReady
};
