import fetch from 'node-fetch';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Ensure output directory exists
const outputDir = path.join(process.cwd(), 'uploads', 'processed');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Process an image by downloading, compressing, and saving it
export const processImage = async (imageUrl, requestId, productId, imageIndex, dbConnected) => {
  try {
    // Download the image
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    
    const imageBuffer = await response.arrayBuffer();
    
    // Process the image with sharp (compress by 50%)
    const processedImageBuffer = await sharp(Buffer.from(imageBuffer))
      .jpeg({ quality: 50 }) // Compress to 50% quality
      .toBuffer();
    
    // Generate a unique filename for the processed image
    const filename = `${uuidv4()}.jpg`;
    const outputPath = path.join(outputDir, filename);
    
    // Save the processed image
    fs.writeFileSync(outputPath, processedImageBuffer);
    
    // In a real-world scenario, you would upload this to a cloud storage service
    // For this example, we'll just use a local path
    const outputUrl = `/uploads/processed/${filename}`;
    
    // Call the webhook callback to update the product
    await fetch('http://localhost:3000/api/webhook/callback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        productId,
        imageIndex,
        outputUrl,
        success: true,
        dbConnected
      }),
    });
    
    return { success: true, outputUrl };
  } catch (error) {
    console.error(`Error processing image ${imageUrl}:`, error);
    
    // Notify the webhook about the failure
    try {
      await fetch('http://localhost:3000/api/webhook/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId,
          productId,
          imageIndex,
          success: false,
          dbConnected
        }),
      });
    } catch (webhookError) {
      console.error('Failed to notify webhook about image processing failure:', webhookError);
    }
    
    return { success: false, error: error.message };
  }
};