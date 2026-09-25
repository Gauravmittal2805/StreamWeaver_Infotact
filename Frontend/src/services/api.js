/**
 * API client configuration and helpers
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Handle HTTP response errors and normalize them into user-friendly messages
 * @param {Response} res 
 * @returns {Promise<any>}
 */
export async function handleApiResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    let errorMessage = 'An unexpected error occurred while communicating with the server.';
    
    if (data && data.message) {
      errorMessage = data.message;
      if (data.error && typeof data.error === 'string') {
        errorMessage += `: ${data.error}`;
      }
    } else if (res.status === 404) {
      errorMessage = 'The requested resource was not found on the server.';
    } else if (res.status === 500) {
      errorMessage = 'Internal server error. Please try again or check backend logs.';
    } else if (res.status === 502 || res.status === 503 || res.status === 504) {
      errorMessage = 'StreamWeaver server is currently unavailable or restarting.';
    }

    const error = new Error(errorMessage);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

/**
 * Performs a health check against the backend
 * @returns {Promise<{ online: boolean, data?: any, error?: string }>}
 */
export async function checkBackendHealth() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return { online: true, data };
    }
    return { online: false, error: `Server responded with HTTP ${res.status}` };
  } catch (err) {
    return {
      online: false,
      error: err.name === 'AbortError' ? 'Health check timed out' : 'Backend server offline (port 5001)'
    };
  }
}
