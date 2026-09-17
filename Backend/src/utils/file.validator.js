import path from 'path';

const ALLOWED_EXTENSIONS = ['.csv', '.json'];
const MAX_FILENAME_LENGTH = 255;

/**
 * Validates file extension
 * @param {string} filename - Original filename
 * @returns {Object} - { valid: boolean, format: string|null, error: string|null }
 */
export function validateFileExtension(filename) {
  const ext = path.extname(filename).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      format: null,
      error: `Invalid file format. Only ${ALLOWED_EXTENSIONS.join(', ')} files are allowed.`
    };
  }
  
  return {
    valid: true,
    format: ext.slice(1), // Remove the dot
    error: null
  };
}

/**
 * Sanitizes filename to prevent path traversal attacks
 * @param {string} filename - Original filename
 * @returns {string} - Safe filename
 */
export function sanitizeFilename(filename) {
  // Remove any path components
  const basename = path.basename(filename);
  
  // Remove any potentially dangerous characters
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  
  // Ensure filename isn't too long
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = path.extname(sanitized);
    const name = sanitized.slice(0, MAX_FILENAME_LENGTH - ext.length);
    return name + ext;
  }
  
  return sanitized;
}

/**
 * Generates a unique dataset ID
 * @returns {string} - Unique dataset ID
 */
export function generateDatasetId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `dataset_${timestamp}_${random}`;
}
