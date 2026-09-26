import express from 'express';
import {
  handleSaveMapping,
  handleGetMapping,
  handleUpdateMapping,
  handleDeleteMapping,
  handlePreviewMapping
} from '../controllers/mapping.controller.js';

const router = express.Router();

// POST /api/mappings/preview - Preview transformation with arbitrary payload
router.post('/preview', handlePreviewMapping);

// POST /api/mappings/:datasetId/preview - Preview transformation for specific dataset
router.post('/:datasetId/preview', handlePreviewMapping);

// POST /api/mappings - Create mapping
router.post('/', handleSaveMapping);

// GET /api/mappings/:datasetId - Retrieve mapping by datasetId
router.get('/:datasetId', handleGetMapping);

// PUT /api/mappings/:datasetId - Update mapping by datasetId
router.put('/:datasetId', handleUpdateMapping);

// DELETE /api/mappings/:datasetId - Delete mapping by datasetId
router.delete('/:datasetId', handleDeleteMapping);

export default router;
