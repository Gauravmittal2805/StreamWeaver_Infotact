import { API_BASE_URL, handleApiResponse } from './api';

/**
 * Service for dataset file operations and streaming uploads
 */
export const fileService = {
  /**
   * Uploads a dataset file using XMLHttpRequest for real-time progress tracking
   * @param {File} file - The file to upload
   * @param {Object} options - Options including onProgress and onStateChange callbacks
   * @returns {Promise<{ dataset: Object, metrics: Object, message: string }>}
   */
  uploadDataset(file, { onProgress, onAbortRef } = {}) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      if (onAbortRef) {
        onAbortRef.current = () => {
          xhr.abort();
        };
      }

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const now = Date.now();
          const timeDelta = (now - lastTime) / 1000;
          const bytesDelta = event.loaded - lastLoaded;
          
          let speedBps = 0;
          if (timeDelta > 0.2) {
            speedBps = bytesDelta / timeDelta;
            lastTime = now;
            lastLoaded = event.loaded;
          }

          const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
          const remainingBytes = event.total - event.loaded;
          const etaSeconds = speedBps > 0 ? Math.ceil(remainingBytes / speedBps) : null;

          onProgress({
            loaded: event.loaded,
            total: event.total,
            percent,
            speedBps,
            etaSeconds,
            elapsedSeconds: (now - startTime) / 1000,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            reject(new Error('Failed to parse upload response from server.'));
          }
        } else {
          let errorMsg = 'Dataset upload failed. Please try again.';
          try {
            const errData = JSON.parse(xhr.responseText);
            if (errData.message) {
              errorMsg = errData.message + (errData.error ? `: ${errData.error}` : '');
            }
          } catch {
            if (xhr.status === 413) {
              errorMsg = 'File size exceeds maximum upload limit allowed by server.';
            } else if (xhr.status === 500) {
              errorMsg = 'Server error occurred during file processing. Please try again.';
            }
          }
          reject(new Error(errorMsg));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Unable to connect to StreamWeaver server. Please check your backend connection.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was cancelled by user.'));
      });

      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out. Please check network connection and retry.'));
      });

      const formData = new FormData();
      formData.append('file', file);

      xhr.open('POST', `${API_BASE_URL}/files/upload`, true);
      xhr.send(formData);
    });
  },

  /**
   * Retrieves all uploaded datasets metadata
   * @returns {Promise<Array>}
   */
  async getAllDatasets() {
    const res = await fetch(`${API_BASE_URL}/files`);
    const data = await handleApiResponse(res);
    return data.datasets || [];
  },

  /**
   * Retrieves single dataset metadata by ID
   * @param {string} datasetId 
   * @returns {Promise<Object>}
   */
  async getDataset(datasetId) {
    const res = await fetch(`${API_BASE_URL}/files/${datasetId}`);
    return await handleApiResponse(res);
  },

  /**
   * Deletes a dataset by ID
   * @param {string} datasetId 
   * @returns {Promise<Object>}
   */
  async deleteDataset(datasetId) {
    const res = await fetch(`${API_BASE_URL}/files/${datasetId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(res);
  },

  /**
   * Check dataset existence and readiness for ETL processing
   * @param {string} datasetId 
   * @returns {Promise<Object>}
   */
  async checkDatasetReady(datasetId) {
    const res = await fetch(`${API_BASE_URL}/files/${datasetId}/check`);
    return await handleApiResponse(res);
  }
};
