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
  },

  /**
   * Fetch streaming limited preview for dataset (Step 11 Member 1 Coordination)
   * @param {string} datasetId 
   * @param {Object} options 
   * @returns {Promise<{ datasetId: string, format: string, filename: string, totalRecordsEstimated: number, previewLimit: number, columns: string[], rows: Object[] }>}
   */
  async getDatasetPreview(datasetId, { limit = 1000, fallbackMock = false } = {}) {
    try {
      const res = await fetch(`${API_BASE_URL}/files/${datasetId}/preview?limit=${limit}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.preview) {
          return data.preview;
        }
      }
    } catch {
      // Backend not running or error
    }

    if (!fallbackMock) {
      throw new Error(`Could not fetch preview for dataset ${datasetId}`);
    }

    // Generate fast simulated high-throughput tabular dataset for virtualization tests (1,000 / 10,000 / 100,000 rows)
    const columns = ['id', 'FirstName', 'LastName', 'Email', 'City', 'Salary', 'Department', 'Status', 'Timestamp'];
    const cities = ['New York', 'San Francisco', 'London', 'Berlin', 'Tokyo', 'Singapore', 'Bengaluru', 'Toronto', 'Sydney', 'Paris', 'Agra', 'Delhi', 'Mumbai', 'Pune'];
    const firstNames = ['Gaurav', 'Rahul', 'Amit', 'Neha', 'Priya', 'Sarah', 'Alex', 'David', 'Elena', 'Chen', 'Maya', 'Liam', 'Ananya', 'Rohan'];
    const lastNames = ['Sharma', 'Verma', 'Patel', 'Kumar', 'Smith', 'Johnson', 'Müller', 'Tanaka', 'Gupta', 'Singh', 'Deshmukh', 'Roy'];
    const depts = ['Engineering', 'Data Analytics', 'Finance', 'Operations', 'Product', 'Security', 'Marketing', 'Sales'];
    const statuses = ['Active', 'Verified', 'Pending', 'Quarantined', 'Archived'];

    const rows = new Array(limit);
    for (let i = 0; i < limit; i++) {
      const fn = firstNames[i % firstNames.length];
      const ln = lastNames[(i * 3) % lastNames.length];
      rows[i] = {
        id: i + 1,
        FirstName: fn,
        LastName: ln,
        Email: `${fn.toLowerCase()}.${ln.toLowerCase()}${i + 100}@example.com`,
        City: cities[(i * 5) % cities.length],
        Salary: `$${(48000 + ((i * 137) % 115000)).toLocaleString()}`,
        Department: depts[(i * 7) % depts.length],
        Status: statuses[i % statuses.length],
        Timestamp: new Date(1774300000000 - i * 60000).toISOString().replace('T', ' ').substring(0, 19)
      };
    }

    return {
      datasetId,
      format: datasetId?.includes('json') ? 'json' : 'csv',
      filename: `${datasetId || 'dataset'}.csv`,
      totalRecordsEstimated: null, // Unknown — do not fabricate for large files
      previewLimit: limit,
      columns,
      rows,
    };
  }
};

