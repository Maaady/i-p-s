import express from 'express';
import { Request } from '../models/Request.js';
import { Product } from '../models/Product.js';

const router = express.Router();

// Get status of a request
router.get('/:requestId', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    let request;
    
    if (req.dbConnected) {
      // Use MongoDB if connected
      request = await Request.findOne({ requestId });
    } else {
      // Use in-memory storage if MongoDB is not available
      request = global.inMemoryDB.getRequestById(requestId);
    }
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    // Calculate progress percentage
    let progress = 0;
    if (request.totalItems > 0) {
      progress = Math.round((request.processedItems / request.totalItems) * 100);
    }
    
    return res.status(200).json({
      requestId: request.requestId,
      status: request.status,
      progress: progress,
      totalItems: request.totalItems,
      processedItems: request.processedItems,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      outputFileName: request.outputFileName || null
    });
  } catch (error) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: 'Failed to check status', details: error.message });
  }
});

// Get detailed results for a completed request
router.get('/:requestId/results', async (req, res) => {
  try {
    const { requestId } = req.params;
    
    let request;
    let products;
    
    if (req.dbConnected) {
      // Use MongoDB if connected
      request = await Request.findOne({ requestId });
      products = await Product.find({ requestId }).sort({ serialNumber: 1 });
    } else {
      // Use in-memory storage if MongoDB is not available
      request = global.inMemoryDB.getRequestById(requestId);
      products = global.inMemoryDB.getProductsByRequestId(requestId)
        .sort((a, b) => a.serialNumber - b.serialNumber);
    }
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }
    
    if (request.status !== 'completed') {
      return res.status(400).json({ 
        error: 'Processing not completed', 
        status: request.status,
        message: 'Results are only available for completed requests'
      });
    }
    
    return res.status(200).json({
      requestId: request.requestId,
      status: request.status,
      totalItems: request.totalItems,
      products: products.map(p => ({
        serialNumber: p.serialNumber,
        productName: p.productName,
        inputImageUrls: p.inputImageUrls,
        outputImageUrls: p.outputImageUrls,
        status: p.status
      })),
      outputFileName: request.outputFileName || null
    });
  } catch (error) {
    console.error('Results fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch results', details: error.message });
  }
});

export const statusRouter = router;