/**
 * Standardized Backend Error Model for StreamWeaver.
 * Consistent error categories and predictable JSON payloads.
 */

export const ERROR_CODES = {
  INVALID_MAPPING: 'INVALID_MAPPING',
  INVALID_TRANSFORMATION: 'INVALID_TRANSFORMATION',
  TRANSFORMATION_ERROR: 'TRANSFORMATION_ERROR',
  SANDBOX_TIMEOUT: 'SANDBOX_TIMEOUT',
  INVALID_DATA: 'INVALID_DATA',
  DATASET_NOT_FOUND: 'DATASET_NOT_FOUND',
  PROCESSING_ERROR: 'PROCESSING_ERROR'
};

export class AppError extends Error {
  constructor(code, message, details = null, statusCode = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code || ERROR_CODES.PROCESSING_ERROR;
    this.details = details;
    this.statusCode = statusCode;
  }
}

/**
 * Formats predictable error response without exposing raw stack traces.
 */
export function sendErrorResponse(res, error, defaultStatusCode = 500) {
  const statusCode = error.statusCode || error.status || defaultStatusCode;
  const code = error.code || ERROR_CODES.PROCESSING_ERROR;
  const message = error.message || 'An unexpected error occurred during processing.';
  const details = error.details || error.errors || null;

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}

export default {
  ERROR_CODES,
  AppError,
  sendErrorResponse
};
