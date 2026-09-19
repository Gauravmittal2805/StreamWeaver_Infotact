import { 
  uploadDataset, 
  getDataset, 
  getAllDatasets, 
  deleteDataset,
  isDatasetReady 
} from '../services/file.service.js';
import { getDatasetInfo } from '../services/dataset.service.js';

/**
 * Handle file upload
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleUpload(req, res) {
  const startTime = Date.now();
  const startMemory = process.memoryUsage();

  try {
    console.log('📤 Receiving file upload...');
    console.log(`🧠 Start Memory - Heap: ${(startMemory.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(startMemory.rss / 1024 / 1024).toFixed(2)} MB`);
    
    const dataset = await uploadDataset(req);
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    const heapDelta = ((endMemory.heapUsed - startMemory.heapUsed) / 1024 / 1024).toFixed(2);
    const rssDelta = ((endMemory.rss - startMemory.rss) / 1024 / 1024).toFixed(2);

    console.log(`⏱️  Upload duration: ${duration}s`);
    console.log(`🧠 End Memory - Heap: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB (+${heapDelta} MB) | RSS: ${(endMemory.rss / 1024 / 1024).toFixed(2)} MB (+${rssDelta} MB)`);
    
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
      },
      metrics: {
        duration: parseFloat(duration),
        memoryDelta: {
          heap: parseFloat(heapDelta),
          rss: parseFloat(rssDelta)
        }
      }
    });
  } catch (error) {
    console.error('❌ Upload error:', error.message);
    
    const endMemory = process.memoryUsage();
    console.log(`🧠 Error Memory - Heap: ${(endMemory.heapUsed / 1024 / 1024).toFixed(2)} MB | RSS: ${(endMemory.rss / 1024 / 1024).toFixed(2)} MB`);
    
    res.status(400).json({
      success: false,
      message: 'Failed to upload dataset',
      error: error.message
    });
  }
}

/**
 * Get dataset by ID - Returns metadata only (Step 8)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleGetDataset(req, res) {
  try {
    const { datasetId } = req.params;
    
    const datasetInfo = getDatasetInfo(datasetId);
    
    if (!datasetInfo) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found',
        error: 'Invalid dataset ID or dataset has been deleted'
      });
    }
    
    // Check dataset readiness (Step 9)
    const readiness = isDatasetReady(datasetId);
    
    res.status(200).json({
      success: true,
      dataset: datasetInfo,
      ready: readiness.ready,
      readyReason: readiness.reason
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
        processingStatus: ds.processingStatus,
        uploadedAt: ds.uploadedAt,
        processedAt: ds.processedAt
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
    
    const dataset = getDataset(datasetId);
    if (!dataset) {
      return res.status(404).json({
        success: false,
        message: 'Dataset not found'
      });
    }
    
    const success = deleteDataset(datasetId);
    
    if (!success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to delete dataset'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Dataset deleted successfully',
      deleted: {
        id: datasetId,
        filename: dataset.originalName
      }
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

/**
 * Check dataset existence and readiness (Step 9)
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 */
export async function handleCheckDataset(req, res) {
  try {
    const { datasetId } = req.params;
    
    const dataset = getDataset(datasetId);
    const readiness = isDatasetReady(datasetId);
    
    if (!dataset) {
      return res.status(404).json({
        success: false,
        exists: false,
        ready: false,
        message: 'Dataset not found'
      });
    }
    
    res.status(200).json({
      success: true,
      exists: true,
      ready: readiness.ready,
      reason: readiness.reason,
      dataset: {
        id: dataset.id,
        status: dataset.status,
        processingStatus: dataset.processingStatus
      }
    });
  } catch (error) {
    console.error('❌ Check dataset error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Failed to check dataset',
      error: error.message
    });
  }
}
