import express from 'express';
import { 
  handleUpload, 
  handleGetDataset, 
  handleGetAllDatasets, 
  handleDeleteDataset 
} from '../controllers/file.controller.js';

const router = express.Router();

// POST /api/files/upload - Upload a dataset file
router.post('/upload', handleUpload);

// GET /api/files - Get all datasets
router.get('/', handleGetAllDatasets);

// GET /api/files/:datasetId - Get specific dataset metadata
router.get('/:datasetId', handleGetDataset);

// DELETE /api/files/:datasetId - Delete a dataset
router.delete('/:datasetId', handleDeleteDataset);

export default router;
