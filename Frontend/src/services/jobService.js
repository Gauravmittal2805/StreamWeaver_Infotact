import { API_BASE_URL, handleApiResponse } from './api';

/**
 * Service for ETL job creation and monitoring
 */
export const jobService = {
  /**
   * Create an ETL job
   * @param {Object} payload 
   * @returns {Promise<Object>}
   */
  async createJob(payload) {
    const res = await fetch(`${API_BASE_URL}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    return await handleApiResponse(res);
  },

  /**
   * Get job status and execution details
   * @param {string} jobId 
   * @returns {Promise<Object>}
   */
  async getJob(jobId) {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}`);
    return await handleApiResponse(res);
  },

  /**
   * Start a created job
   * @param {string} jobId 
   * @returns {Promise<Object>}
   */
  async startJob(jobId) {
    const res = await fetch(`${API_BASE_URL}/jobs/${jobId}/start`, {
      method: 'POST',
    });
    return await handleApiResponse(res);
  },
};
