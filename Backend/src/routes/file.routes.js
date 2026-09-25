import express from 'express';
import { 
  handleUpload, 
  handleGetDataset, 
  handleGetAllDatasets, 
  handleDeleteDataset,
  handleCheckDataset,
  handleGetProgress,
  handleGetPreview
} from '../controllers/file.controller.js';


import {
  handleSaveMapping,
  handleGetMapping,
  handleUpdateMapping,
  handleDeleteMapping
} from '../controllers/mapping.controller.js';

const router = express.Router();

// POST /api/files/upload - Upload a dataset file
router.post('/upload', handleUpload);

// GET /api/files - Get all datasets
router.get('/', handleGetAllDatasets);

// GET /api/files/:datasetId/check - Check dataset existence and readiness
router.get('/:datasetId/check', handleCheckDataset);

// GET /api/files/:datasetId/progress - Get upload progress (Step 13 - for Member 3)
router.get('/:datasetId/progress', handleGetProgress);

// GET /api/files/:datasetId/preview - Get limited streaming preview (Step 11)
router.get('/:datasetId/preview', handleGetPreview);

// GET /api/files/:datasetId/mapping - Get dataset mapping configuration
router.get('/:datasetId/mapping', handleGetMapping);

// POST /api/files/:datasetId/mapping - Save/Update dataset mapping configuration
router.post('/:datasetId/mapping', (req, res, next) => {
  req.body = { ...(req.body || {}), datasetId: req.params.datasetId };
  return handleSaveMapping(req, res, next);
});

// PUT /api/files/:datasetId/mapping - Update dataset mapping configuration
router.put('/:datasetId/mapping', handleUpdateMapping);

// DELETE /api/files/:datasetId/mapping - Delete dataset mapping configuration
router.delete('/:datasetId/mapping', handleDeleteMappedConfig);

// GET /api/files/:datasetId - Get specific dataset metadata
router.get('/:datasetId', handleGetDataset);

// DELETE /api/files/:datasetId - Delete a dataset
router.delete('/:datasetId', handleDeleteDataset);

function handleDeleteMappedConfig(req, res, next) {
  return handleDeleteMapping(req, res, next);
}

export default router;
