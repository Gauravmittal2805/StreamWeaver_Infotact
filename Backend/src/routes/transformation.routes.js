import express from 'express';
import {
  handleSaveTransformation,
  handleGetTransformation,
  handleUpdateTransformation,
  handleDeleteTransformation,
  handlePreviewTransformation,
  handleGetSupportedTransformations
} from '../controllers/transformation.controller.js';

const router = express.Router();

// GET /api/transformations/supported - List predefined supported transformations
router.get('/supported', handleGetSupportedTransformations);

// POST /api/transformations/preview - Generate transformation preview
router.post('/preview', handlePreviewTransformation);

// POST /api/transformations/:datasetId/preview - Generate transformation preview for dataset
router.post('/:datasetId/preview', handlePreviewTransformation);

// POST /api/transformations - Create transformation configuration
router.post('/', handleSaveTransformation);

// GET /api/transformations/:datasetId - Retrieve transformation configuration by datasetId
router.get('/:datasetId', handleGetTransformation);

// PUT /api/transformations/:datasetId - Update transformation configuration by datasetId
router.put('/:datasetId', handleUpdateTransformation);

// DELETE /api/transformations/:datasetId - Delete transformation configuration by datasetId
router.delete('/:datasetId', handleDeleteTransformation);

export default router;
