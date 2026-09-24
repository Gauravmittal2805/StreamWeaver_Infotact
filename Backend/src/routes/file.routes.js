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

// GET /api/files/:datasetId - Get specific dataset metadata
router.get('/:datasetId', handleGetDataset);


// DELETE /api/files/:datasetId - Delete a dataset
router.delete('/:datasetId', handleDeleteDataset);

export default router;
