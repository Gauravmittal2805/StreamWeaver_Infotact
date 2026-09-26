import { API_BASE_URL, handleApiResponse } from './api';

const LOCAL_STORAGE_KEY_PREFIX = 'streamweaver_mapping_';

/**
 * Helper to get local storage key for a dataset
 * @param {string} datasetId 
 * @returns {string}
 */
const getStorageKey = (datasetId) => `${LOCAL_STORAGE_KEY_PREFIX}${datasetId}`;

/**
 * Mapping service for handling ETL mapping and transformation configurations.
 * Includes a fallback to localStorage and client-side processing for offline resilience.
 */
export const mappingService = {
  /**
   * Retrieve saved mappings for a dataset
   * @param {string} datasetId 
   * @returns {Promise<Object>}
   */
  async getMappings(datasetId) {
    try {
      const response = await fetch(`${API_BASE_URL}/mappings/${datasetId}`);
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Mapping API unavailable, using localStorage fallback:', error.message);
      const data = localStorage.getItem(getStorageKey(datasetId));
      if (data) {
        return JSON.parse(data);
      }
      return {
        datasetId,
        mappings: [],
        destinationFields: [],
        createdAt: null,
        updatedAt: null,
      };
    }
  },

  /**
   * Create a new mapping & transformation configuration
   * @param {string} datasetId 
   * @param {Object} mapping 
   * @returns {Promise<Object>}
   */
  async saveMapping(datasetId, mapping) {
    const dataToSave = {
      ...mapping,
      datasetId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/mappings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Mapping API unavailable, using localStorage fallback:', error.message);
      localStorage.setItem(getStorageKey(datasetId), JSON.stringify(dataToSave));
      return {
        success: true,
        mapping: dataToSave
      };
    }
  },

  /**
   * Update existing mapping & transformation configuration
   * @param {string} datasetId 
   * @param {Object} mapping 
   * @returns {Promise<Object>}
   */
  async updateMapping(datasetId, mapping) {
    const dataToSave = {
      ...mapping,
      datasetId,
      updatedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(`${API_BASE_URL}/mappings/${datasetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Mapping API unavailable, using localStorage fallback:', error.message);
      
      const existingDataRaw = localStorage.getItem(getStorageKey(datasetId));
      if (existingDataRaw) {
        const existingData = JSON.parse(existingDataRaw);
        dataToSave.createdAt = existingData.createdAt;
      } else {
        dataToSave.createdAt = new Date().toISOString();
      }

      localStorage.setItem(getStorageKey(datasetId), JSON.stringify(dataToSave));
      return {
        success: true,
        mapping: dataToSave
      };
    }
  },

  /**
   * Request backend transformation preview on sample rows
   * @param {string} datasetId 
   * @param {Object} previewPayload - { mappings, sampleRows, limit }
   * @returns {Promise<Object>}
   */
  async previewTransformation(datasetId, previewPayload = {}) {
    const url = datasetId
      ? `${API_BASE_URL}/mappings/${datasetId}/preview`
      : `${API_BASE_URL}/mappings/preview`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          datasetId,
          ...previewPayload
        }),
      });
      return await handleApiResponse(response);
    } catch (error) {
      console.warn('Mapping preview API failed/unavailable:', error.message);
      throw error;
    }
  },

  /**
   * Delete a mapping configuration
   * @param {string} datasetId 
   * @returns {Promise<void>}
   */
  async deleteMapping(datasetId) {
    try {
      const response = await fetch(`${API_BASE_URL}/mappings/${datasetId}`, {
        method: 'DELETE',
      });
      await handleApiResponse(response);
    } catch (error) {
      console.warn('Mapping API unavailable, using localStorage fallback:', error.message);
      localStorage.removeItem(getStorageKey(datasetId));
    }
  }
};

export default mappingService;
