import { uploadDataset, getDataset, getAllDatasets, deleteDataset } from '../services/file.service.js';

/**
 * Handle file upload
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleUpload(req, res) {
  try {
    console.log('📤 Receiving file upload...');
    
    const dataset = await uploadDataset(req);
    
    res.status(200).json({
      success: true,
      message: 'Dataset uploaded successfully',
      dataset: {
        id: dataset.id,
        filename: dataset.originalName,
        format: dataset.format,
        size: dataset.size,
        status: dataset.status,
        uploadedAt: dataset.uploadedAt
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    
    res.status(400).json({
      success: false,
      message: 'Failed to upload dataset',
      error: error.message
    });
  }
}

/**
 * Get dataset by ID
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleGetDataset(req, res) {
  try {
    const { datasetId } = req.params;
    
    const dataset = getDataset(datasetId);
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }
    
    res.status(200).json({
      success: true,
      dataset: {
        id: dataset.id,
        filename: dataset.originalName,
        format: dataset.format,
        size: dataset.size,
        status: dataset.status,
        uploadedAt: dataset.uploadedAt
      }
    });
  } catch (error) {
    console.error('❌ Get dataset error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve dataset',
      error: error.message
    });
  }
}

/**
 * Get all datasets
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleGetAllDatasets(req, res) {
  try {
    const datasets = getAllDatasets();
    
    res.status(200).json({
      success: true,
      count: datasets.length,
      datasets: datasets.map(ds => ({
        id: ds.id,
        filename: ds.originalName,
        format: ds.format,
        size: ds.size,
        status: ds.status,
        uploadedAt: ds.uploadedAt
      }))
    });
  } catch (error) {
    console.error('❌ Get all datasets error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve datasets',
      error: error.message
    });
  }
}

/**
 * Delete dataset
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleDeleteDataset(req, res) {
  try {
    const { datasetId } = req.params;
    
    const success = deleteDataset(datasetId);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found or already deleted'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Dataset deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete dataset error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete dataset',
      error: error.message
    });
  }
}
