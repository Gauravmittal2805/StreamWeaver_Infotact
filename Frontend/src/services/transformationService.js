import { API_BASE_URL, handleApiResponse } from './api';

const LOCAL_STORAGE_KEY_PREFIX = 'streamweaver_transformation_';

const getStorageKey = (datasetId) => `${LOCAL_STORAGE_KEY_PREFIX}${datasetId}`;

/**
 * Transformation service for handling ETL transformation configurations and previews.
 */
export const transformationService = {
  /**
   * Retrieve saved transformations for a dataset
   * @param {string} datasetId 
   * @returns {Promise<Object>}
   */
  async getTransformations(datasetId) {
    try {
      const response = await fetch(`${API_BASE_URL}/transformations/${datasetId}`);
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Transformation API unavailable, using localStorage fallback:', error.message);
      const data = localStorage.getItem(getStorageKey(datasetId));
      if (data) {
        return JSON.parse(data);
      }
      return {
        datasetId,
        transformations: [],
        createdAt: null,
        updatedAt: null,
      };
    }
  },

  /**
   * Save a transformation configuration
   * @param {string} datasetId 
   * @param {Object} transformation 
   * @returns {Promise<Object>}
   */
  async saveTransformation(datasetId, transformation) {
    const dataToSave = {
      ...transformation,
      datasetId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/transformations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Transformation API unavailable, using localStorage fallback:', error.message);
      localStorage.setItem(getStorageKey(datasetId), JSON.stringify(dataToSave));
      return dataToSave;
    }
  },

  /**
   * Update existing transformation configuration
   * @param {string} datasetId 
   * @param {Object} transformation 
   * @returns {Promise<Object>}
   */
  async updateTransformation(datasetId, transformation) {
    const dataToSave = {
      ...transformation,
      datasetId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/transformations/${datasetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Transformation API unavailable, using localStorage fallback:', error.message);
      localStorage.setItem(getStorageKey(datasetId), JSON.stringify(dataToSave));
      return dataToSave;
    }
  },

  /**
   * Delete transformation configuration
   * @param {string} datasetId 
   * @returns {Promise<void>}
   */
  async deleteTransformation(datasetId) {
    try {
      const response = await fetch(`${API_BASE_URL}/transformations/${datasetId}`, {
        method: 'DELETE',
      });
      await handleApiResponse(response);
    } catch (error) {
      console.warn('Transformation API unavailable, using localStorage fallback:', error.message);
      localStorage.removeItem(getStorageKey(datasetId));
    }
  },

  /**
   * Generate transformation preview for N records (Step 12)
   * @param {Object} options - { datasetId, limit, mappingConfig, transformationConfig, rawRecords }
   * @returns {Promise<Object>}
   */
  async getPreview(options = {}) {
    const response = await fetch(`${API_BASE_URL}/transformations/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(options),
    });
    return await handleApiResponse(response);
  },

  /**
   * Retrieve supported transformations list
   * @returns {Promise<Array>}
   */
  async getSupportedTransformations() {
    const response = await fetch(`${API_BASE_URL}/transformations/supported`);
    return await handleApiResponse(response);
  }
};

export default transformationService;
