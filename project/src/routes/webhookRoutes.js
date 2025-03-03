import express from 'express';
import { Request } from '../models/Request.js';
import { Product } from '../models/Product.js';
import { generateOutputCSV } from '../services/csvService.js';

const router = express.Router();

// Webhook endpoint for image processing service callbacks
router.post('/callback', async (req, res) => {
  try {
    const { requestId, productId, imageIndex, outputUrl, success } = req.body;
    
    if (!requestId || !productId || imageIndex === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    // Find the product
    let product;
    let request;
    
    if (req.dbConnected) {
      // Use MongoDB if connected
      product = await Product.findById(productId);
      request = await Request.findOne({ requestId });
    } else {
      // Use in-memory storage if MongoDB is not available
      product = global.inMemoryDB.products.find(p => p._id === productId);
      request = global.inMemoryDB.getRequestById(requestId);
    }
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Update the product with the processed image URL
    if (success) {
      // Set the output URL at the correct index
      const outputImageUrls = [...product.outputImageUrls];
      outputImageUrls[imageIndex] = outputUrl;
      
      // Check if all images for this product are processed
      const allProcessed = outputImageUrls.every(url => url && url.length > 0);
      
      if (req.dbConnected) {
        // Update in MongoDB
        product.outputImageUrls = outputImageUrls;
        if (allProcessed) {
          product.status = 'completed';
        }
        await product.save();
      } else {
        // Update in memory
        const updatedProduct = {
          ...product,
          outputImageUrls,
          status: allProcessed ? 'completed' : product.status,
          updatedAt: new Date()
        };
        global.inMemoryDB.updateProduct(productId, updatedProduct);
        product = updatedProduct;
      }
      
      // Update the request status
      if (request) {
        const updatedProcessedItems = request.processedItems + 1;
        const allProductsProcessed = updatedProcessedItems >= request.totalItems;
        
        if (allProductsProcessed) {
          // Generate output CSV
          const outputFileName = await generateOutputCSV(requestId, req.dbConnected);
          
          if (req.dbConnected) {
            // Update in MongoDB
            request.processedItems = updatedProcessedItems;
            request.status = 'completed';
            request.outputFileName = outputFileName;
            request.updatedAt = new Date();
            await request.save();
          } else {
            // Update in memory
            const updatedRequest = {
              ...request,
              processedItems: updatedProcessedItems,
              status: 'completed',
              outputFileName,
              updatedAt: new Date()
            };
            global.inMemoryDB.updateRequest(requestId, updatedRequest);
            request = updatedRequest;
          }
          
          // Call the webhook if provided
          if (request.webhookUrl) {
            try {
              await fetch(request.webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requestId,
                  status: 'completed',
                  outputFileName
                }),
              });
            } catch (webhookError) {
              console.error('Webhook call failed:', webhookError);
            }
          }
        } else {
          // Just update the processed items count
          if (req.dbConnected) {
            request.processedItems = updatedProcessedItems;
            request.updatedAt = new Date();
            await request.save();
          } else {
            const updatedRequest = {
              ...request,
              processedItems: updatedProcessedItems,
              updatedAt: new Date()
            };
            global.inMemoryDB.updateRequest(requestId, updatedRequest);
          }
        }
      }
    } else {
      // Mark as failed if processing failed
      if (req.dbConnected) {
        product.status = 'failed';
        await product.save();
      } else {
        const updatedProduct = {
          ...product,
          status: 'failed',
          updatedAt: new Date()
        };
        global.inMemoryDB.updateProduct(productId, updatedProduct);
        product = updatedProduct;
      }
      
      // Update the request
      if (request) {
        const updatedProcessedItems = request.processedItems + 1;
        const allProductsProcessed = updatedProcessedItems >= request.totalItems;
        
        if (allProductsProcessed) {
          // Generate output CSV with whatever was successfully processed
          const outputFileName = await generateOutputCSV(requestId, req.dbConnected);
          
          if (req.dbConnected) {
            request.processedItems = updatedProcessedItems;
            request.status = 'completed';
            request.outputFileName = outputFileName;
            request.updatedAt = new Date();
            await request.save();
          } else {
            const updatedRequest = {
              ...request,
              processedItems: updatedProcessedItems,
              status: 'completed',
              outputFileName,
              updatedAt: new Date()
            };
            global.inMemoryDB.updateRequest(requestId, updatedRequest);
            request = updatedRequest;
          }
          
          // Call the webhook if provided
          if (request.webhookUrl) {
            try {
              await fetch(request.webhookUrl, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requestId,
                  status: 'completed',
                  outputFileName
                }),
              });
            } catch (webhookError) {
              console.error('Webhook call failed:', webhookError);
            }
          }
        } else {
          // Just update the processed items count
          if (req.dbConnected) {
            request.processedItems = updatedProcessedItems;
            request.updatedAt = new Date();
            await request.save();
          } else {
            const updatedRequest = {
              ...request,
              processedItems: updatedProcessedItems,
              updatedAt: new Date()
            };
            global.inMemoryDB.updateRequest(requestId, updatedRequest);
          }
        }
      }
    }
    
    return res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return res.status(500).json({ error: 'Webhook processing failed', details: error.message });
  }
});

export const webhookRouter = router;