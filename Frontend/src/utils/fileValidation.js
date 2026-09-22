/**
 * File validation utility for StreamWeaver datasets
 */

export const ALLOWED_EXTENSIONS = ['.csv', '.json'];
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB limit

/**
 * Validates a dataset file prior to uploading
 * @param {File} file - The file to validate
 * @returns {{ valid: boolean, error?: string, format?: string }}
 */
export function validateDatasetFile(file) {
  if (!file) {
    return {
      valid: false,
      error: 'No file selected. Please choose a dataset to upload.'
    };
  }

  // Check file size
  if (file.size === 0) {
    return {
      valid: false,
      error: 'The selected file is empty (0 bytes). Please select a valid dataset file.'
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds maximum allowed upload limit of 10 GB.'
    };
  }

  // Check file extension
  const fileName = file.name || '';
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    return {
      valid: false,
      error: 'Unsupported file type. Please upload a CSV or JSON dataset.'
    };
  }

  const extension = fileName.substring(lastDotIndex).toLowerCase();
  
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type "${extension}". Please upload a CSV or JSON dataset.`
    };
  }

  const format = extension === '.csv' ? 'csv' : 'json';

  return {
    valid: true,
    format,
  };
}
