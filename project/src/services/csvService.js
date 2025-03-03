import fs from 'fs';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import csv from 'csv-parser';
import { Request } from '../models/Request.js';
import { Product } from '../models/Product.js';
import { processImage } from './imageService.js';
import { v4 as uuidv4 } from 'uuid';

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Process the CSV file
export const processCSV = async (filePath, requestId, webhookUrl, dbConnected) => {
  try {
    const products = [];
    let rowCount = 0;
    
    // Read and parse the CSV file
    await new Promise((resolve, reject) => {
      createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
          // Validate row data
          if (!row['S. No.'] || !row['Product Name'] || !row['Input Image Urls']) {
            console.warn('Invalid row format:', row);
            return;
          }
          
          // Parse the input image URLs
          const inputImageUrls = row['Input Image Urls']
            .split(',')
            .map(url => url.trim())
            .filter(url => url.length > 0);
          
          if (inputImageUrls.length === 0) {
            console.warn('No valid image URLs found for row:', row);
            return;
          }
          
          // Create a product record
          const product = {
            _id: uuidv4(), // Generate ID for in-memory storage
            requestId,
            serialNumber: parseInt(row['S. No.'], 10),
            productName: row['Product Name'],
            inputImageUrls,
            outputImageUrls: Array(inputImageUrls.length).fill(''),
            status: 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          products.push(product);
          rowCount++;
        })
        .on('end', () => {
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
    
    // Update the request with the total number of products
    if (dbConnected) {
      // Use MongoDB if connected
      await Request.findOneAndUpdate(
        { requestId },
        { 
          status: 'processing',
          totalItems: rowCount,
          updatedAt: new Date()
        }
      );
      
      // Save all products to the database
      const savedProducts = await Product.insertMany(products);
      
      // Process each product's images asynchronously
      for (const product of savedProducts) {
        product.status = 'processing';
        await product.save();
        
        // Process each image URL
        product.inputImageUrls.forEach((imageUrl, index) => {
          processImage(imageUrl, requestId, product._id.toString(), index, dbConnected)
            .catch(err => console.error(`Error processing image ${imageUrl}:`, err));
        });
      }
    } else {
      // Use in-memory storage if MongoDB is not available
      const request = global.inMemoryDB.getRequestById(requestId);
      if (request) {
        const updatedRequest = {
          ...request,
          status: 'processing',
          totalItems: rowCount,
          updatedAt: new Date()
        };
        global.inMemoryDB.updateRequest(requestId, updatedRequest);
      }
      
      // Add products to in-memory storage
      global.inMemoryDB.addProducts(products);
      
      // Process each product's images asynchronously
      for (const product of products) {
        const updatedProduct = {
          ...product,
          status: 'processing',
          updatedAt: new Date()
        };
        global.inMemoryDB.updateProduct(product._id, updatedProduct);
        
        // Process each image URL
        product.inputImageUrls.forEach((imageUrl, index) => {
          processImage(imageUrl, requestId, product._id, index, dbConnected)
            .catch(err => console.error(`Error processing image ${imageUrl}:`, err));
        });
      }
    }
    
    return { success: true, message: 'CSV processing started' };
  } catch (error) {
    console.error('CSV processing error:', error);
    
    // Update the request status to failed
    if (dbConnected) {
      await Request.findOneAndUpdate(
        { requestId },
        { status: 'failed', updatedAt: new Date() }
      );
    } else {
      const request = global.inMemoryDB.getRequestById(requestId);
      if (request) {
        const updatedRequest = {
          ...request,
          status: 'failed',
          updatedAt: new Date()
        };
        global.inMemoryDB.updateRequest(requestId, updatedRequest);
      }
    }
    
    return { success: false, error: error.message };
  }
};

// Generate output CSV file
export const generateOutputCSV = async (requestId, dbConnected) => {
  try {
    let products;
    
    if (dbConnected) {
      // Use MongoDB if connected
      products = await Product.find({ requestId }).sort({ serialNumber: 1 });
    } else {
      // Use in-memory storage if MongoDB is not available
      products = global.inMemoryDB.getProductsByRequestId(requestId)
        .sort((a, b) => a.serialNumber - b.serialNumber);
    }
    
    const outputFileName = `output-${requestId}.csv`;
    const outputPath = path.join(uploadsDir, outputFileName);
    
    const writeStream = createWriteStream(outputPath);
    
    // Write CSV header
    writeStream.write('S. No.,Product Name,Input Image Urls,Output Image Urls\n');
    
    // Write each product row
    for (const product of products) {
      const inputUrls = product.inputImageUrls.join(', ');
      const outputUrls = product.outputImageUrls.join(', ');
      
      writeStream.write(`${product.serialNumber},${product.productName},"${inputUrls}","${outputUrls}"\n`);
    }
    
    writeStream.end();
    
    return outputFileName;
  } catch (error) {
    console.error('Error generating output CSV:', error);
    throw error;
  }
};