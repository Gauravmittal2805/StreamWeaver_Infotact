import {
  saveMapping,
  getMapping,
  updateMapping,
  deleteMapping,
  validateMapping,
  getDatasetWithMapping
} from '../services/mapping.service.js';

/**
 * Handle POST /api/mappings - Create a new mapping configuration
 */
export async function handleSaveMapping(req, res) {
  try {
    const payload = req.body || {};
    
    const validation = validateMapping(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Mapping validation failed',
        errors: validation.errors
      });
    }

    const mapping = saveMapping(payload);

    res.status(201).json({
      success: true,
      message: 'Mapping configuration saved successfully',
      mapping
    });
  } catch (error) {
    console.error('❌ Save mapping error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to save mapping configuration',
      errors: error.details || [error.message]
    });
  }
}

/**
 * Handle GET /api/mappings/:datasetId - Retrieve mapping configuration for a dataset
 */
export async function handleGetMapping(req, res) {
  try {
    const { datasetId } = req.params;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Dataset ID parameter is required'
      });
    }

    const mapping = getMapping(datasetId);
    const datasetWithMapping = getDatasetWithMapping(datasetId);

    if (!datasetWithMapping) {
      return res.status(404).json({
        success: false,
        message: `Dataset '${datasetId}' not found`
      });
    }

    if (!mapping) {
      return res.status(404).json({
        success: false,
        message: `No mapping configuration found for dataset '${datasetId}'`,
        dataset: datasetWithMapping.dataset
      });
    }

    res.status(200).json({
      success: true,
      mapping,
      architecture: datasetWithMapping
    });
  } catch (error) {
    console.error('❌ Get mapping error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve mapping configuration',
      error: error.message
    });
  }
}

/**
 * Handle PUT /api/mappings/:datasetId - Update mapping configuration
 */
export async function handleUpdateMapping(req, res) {
  try {
    const { datasetId } = req.params;
    const payload = {
      ...(req.body || {}),
      datasetId
    };

    const validation = validateMapping(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Mapping validation failed',
        errors: validation.errors
      });
    }

    const mapping = updateMapping(datasetId, payload);

    res.status(200).json({
      success: true,
      message: 'Mapping configuration updated successfully',
      mapping
    });
  } catch (error) {
    console.error('❌ Update mapping error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update mapping configuration',
      errors: error.details || [error.message]
    });
  }
}

/**
 * Handle DELETE /api/mappings/:datasetId - Delete mapping configuration
 */
export async function handleDeleteMapping(req, res) {
  try {
    const { datasetId } = req.params;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Dataset ID parameter is required'
      });
    }

    const existing = getMapping(datasetId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No mapping configuration found for dataset '${datasetId}'`
      });
    }

    const deleted = deleteMapping(datasetId);

    res.status(200).json({
      success: true,
      message: `Mapping configuration for dataset '${datasetId}' deleted successfully`,
      deleted
    });
  } catch (error) {
    console.error('❌ Delete mapping error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete mapping configuration',
      error: error.message
    });
  }
}

export default {
  handleSaveMapping,
  handleGetMapping,
  handleUpdateMapping,
  handleDeleteMapping
};
