/**
 * File Integrity Service (Step 7)
 * Validates file integrity after upload completion
 */

import fs from 'fs';

/**
 * Verify file integrity after upload
 * @param {Object} params - { filePath, expectedSize, uploadedBytes, format }
 * @returns {Object} - { valid: boolean, errors: Array }
 */
export function verifyFileIntegrity(params) {
  const { filePath, expectedSize, uploadedBytes, format } = params;
  const errors = [];

  // Check 1: File exists
  if (!fs.existsSync(filePath)) {
    errors.push('File does not exist on disk');
    return { valid: false, errors };
  }

  // Check 2: Get actual file size
  let actualSize;
  try {
    const stats = fs.statSync(filePath);
    actualSize = stats.size;
  } catch (error) {
    errors.push(`Cannot read file stats: ${error.message}`);
    return { valid: false, errors };
  }

  // Check 3: File size is greater than minimum (not empty)
  const MIN_FILE_SIZE = 10; // 10 bytes minimum
  if (actualSize < MIN_FILE_SIZE) {
    errors.push(`File is too small (${actualSize} bytes). Minimum: ${MIN_FILE_SIZE} bytes`);
  }

  // Check 4: Stored file size matches received byte count
  if (uploadedBytes && actualSize !== uploadedBytes) {
    errors.push(`Size mismatch: stored ${actualSize} bytes but received ${uploadedBytes} bytes`);
  }

  // Check 5: If expected size provided, verify it matches
  if (expectedSize && actualSize !== expectedSize) {
    errors.push(`Size mismatch: expected ${expectedSize} bytes but got ${actualSize} bytes`);
  }

  // Check 6: Basic format validation for CSV
  if (format === 'csv') {
    const csvCheck = validateCSVFormat(filePath);
    if (!csvCheck.valid) {
      errors.push(...csvCheck.errors);
    }
  }

  // Check 7: Basic format validation for JSON
  if (format === 'json') {
    const jsonCheck = validateJSONFormat(filePath);
    if (!jsonCheck.valid) {
      errors.push(...jsonCheck.errors);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    actualSize
  };
}

/**
 * Validate CSV format (basic check)
 * @param {string} filePath - Path to CSV file
 * @returns {Object} - { valid: boolean, errors: Array }
 */
function validateCSVFormat(filePath) {
  const errors = [];

  try {
    // Read first 1KB to check for CSV header
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) {
      errors.push('CSV file is empty');
      return { valid: false, errors };
    }

    const firstLine = buffer.toString('utf8', 0, bytesRead).split('\n')[0];
    
    // Check if first line has commas (basic CSV check)
    if (!firstLine.includes(',')) {
      errors.push('CSV file does not appear to have comma-separated values');
    }

  } catch (error) {
    errors.push(`CSV validation error: ${error.message}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate JSON format (basic check)
 * @param {string} filePath - Path to JSON file
 * @returns {Object} - { valid: boolean, errors: Array }
 */
function validateJSONFormat(filePath) {
  const errors = [];

  try {
    // Read first 1KB to check for JSON structure
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, buffer, 0, 1024, 0);
    fs.closeSync(fd);

    if (bytesRead === 0) {
      errors.push('JSON file is empty');
      return { valid: false, errors };
    }

    const content = buffer.toString('utf8', 0, bytesRead).trim();
    
    // Check if starts with { or [
    if (!content.startsWith('{') && !content.startsWith('[')) {
      errors.push('JSON file does not start with { or [');
    }

  } catch (error) {
    errors.push(`JSON validation error: ${error.message}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate file checksum (optional - for future use)
 * @param {string} filePath - Path to file
 * @returns {Promise<string>} - File checksum
 */
export async function calculateChecksum(filePath) {
  return new Promise((resolve, reject) => {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}
