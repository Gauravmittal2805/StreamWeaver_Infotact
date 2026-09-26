import {
  saveTransformation,
  getTransformation,
  updateTransformation,
  deleteTransformation,
  validateTransformation,
  getSupportedTransformationsList
} from '../services/transformation.service.js';
import { previewTransformations } from '../services/transformation.preview.js';
import { getDatasetInfo } from '../services/dataset.service.js';

/**
 * Handle POST /api/transformations - Create a new transformation configuration
 */
export async function handleSaveTransformation(req, res) {
  try {
    const payload = req.body || {};

    const validation = validateTransformation(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Transformation validation failed',
        errors: validation.errors
      });
    }

    const transformation = saveTransformation(payload);

    res.status(201).json({
      success: true,
      message: 'Transformation configuration saved successfully',
      transformation
    });
  } catch (error) {
    console.error('❌ Save transformation error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to save transformation configuration',
      errors: error.details || [error.message]
    });
  }
}

/**
 * Handle GET /api/transformations/:datasetId - Retrieve transformation configuration
 */
export async function handleGetTransformation(req, res) {
  try {
    const { datasetId } = req.params;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Dataset ID parameter is required'
      });
    }

    const datasetInfo = getDatasetInfo(datasetId);
    if (!datasetInfo) {
      return res.status(404).json({
        success: false,
        message: `Dataset '${datasetId}' not found`
      });
    }

    const transformation = getTransformation(datasetId);

    if (!transformation) {
      return res.status(404).json({
        success: false,
        message: `No transformation configuration found for dataset '${datasetId}'`,
        dataset: datasetInfo
      });
    }

    res.status(200).json({
      success: true,
      transformation,
      dataset: datasetInfo
    });
  } catch (error) {
    console.error('❌ Get transformation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve transformation configuration',
      error: error.message
    });
  }
}

/**
 * Handle PUT /api/transformations/:datasetId - Update transformation configuration
 */
export async function handleUpdateTransformation(req, res) {
  try {
    const { datasetId } = req.params;
    const payload = {
      ...(req.body || {}),
      datasetId
    };

    const validation = validateTransformation(payload);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: 'Transformation validation failed',
        errors: validation.errors
      });
    }

    const transformation = updateTransformation(datasetId, payload);

    res.status(200).json({
      success: true,
      message: 'Transformation configuration updated successfully',
      transformation
    });
  } catch (error) {
    console.error('❌ Update transformation error:', error.message);
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      message: error.message || 'Failed to update transformation configuration',
      errors: error.details || [error.message]
    });
  }
}

/**
 * Handle DELETE /api/transformations/:datasetId - Delete transformation configuration
 */
export async function handleDeleteTransformation(req, res) {
  try {
    const { datasetId } = req.params;

    if (!datasetId) {
      return res.status(400).json({
        success: false,
        message: 'Dataset ID parameter is required'
      });
    }

    const existing = getTransformation(datasetId);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `No transformation configuration found for dataset '${datasetId}'`
      });
    }

    const deleted = deleteTransformation(datasetId);

    res.status(200).json({
      success: true,
      message: `Transformation configuration for dataset '${datasetId}' deleted successfully`,
      deleted
    });
  } catch (error) {
    console.error('❌ Delete transformation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete transformation configuration',
      error: error.message
    });
  }
}

/**
 * Handle POST /api/transformations/preview and POST /api/transformations/:datasetId/preview
 * Step 12 — Preview Transformation
 */
export async function handlePreviewTransformation(req, res) {
  try {
    const datasetId = req.params.datasetId || req.body.datasetId;
    const { limit = 100, mappingConfig, transformationConfig, rawRecords } = req.body || {};

    const options = {
      datasetId,
      limit,
      mappingConfig,
      transformationConfig,
      rawRecords
    };

    const result = await previewTransformations(options);

    res.status(200).json({
      success: true,
      message: `Transformation preview generated for ${result.count} records`,
      count: result.count,
      limit: result.limit,
      preview: result.preview
    });
  } catch (error) {
    console.error('❌ Transformation preview error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate transformation preview',
      error: error.message
    });
  }
}

/**
 * Handle GET /api/transformations/supported - Return list of predefined supported transformations
 */
export async function handleGetSupportedTransformations(req, res) {
  try {
    const supported = getSupportedTransformationsList();
    res.status(200).json({
      success: true,
      transformations: supported
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve supported transformations',
      error: error.message
    });
  }
}

export default {
  handleSaveTransformation,
  handleGetTransformation,
  handleUpdateTransformation,
  handleDeleteTransformation,
  handlePreviewTransformation,
  handleGetSupportedTransformations
};
