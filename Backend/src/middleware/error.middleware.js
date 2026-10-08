import { sendErrorResponse } from '../utils/errors.js';

/**
 * 404 Route Not Found Middleware
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    }
  });
}

/**
 * Centralized Global Error Handling Middleware
 * Prevents server crashes and redacts sensitive stack traces in responses.
 */
export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status || 500;
  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err.message);
  }
  return sendErrorResponse(res, err, statusCode);
}

export default {
  notFoundHandler,
  errorHandler
};
