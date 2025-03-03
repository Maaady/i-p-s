import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { processCSV } from '../services/csvService.js';
import { Request } from '../models/Request.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Upload CSV file endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const requestId = uuidv4();
    const webhookUrl = req.body.webhookUrl || null;
    const now = new Date();

    // Create a new request record
    let newRequest;
    
    if (req.dbConnected) {
      // Use MongoDB if connected
      newRequest = new Request({
        requestId,
        status: 'pending',
        originalFileName: req.file.originalname,
        webhookUrl,
        createdAt: now,
        updatedAt: now
      });
      
      await newRequest.save();
    } else {
      // Use in-memory storage if MongoDB is not available
      newRequest = {
        _id: uuidv4(),
        requestId,
        status: 'pending',
        totalItems: 0,
        processedItems: 0,
        originalFileName: req.file.originalname,
        outputFileName: null,
        webhookUrl,
        createdAt: now,
        updatedAt: now
      };
      
      global.inMemoryDB.addRequest(newRequest);
    }

    // Process the CSV file asynchronously
    processCSV(req.file.path, requestId, webhookUrl, req.dbConnected)
      .catch(err => console.error('Error processing CSV:', err));

    // Return the request ID immediately
    return res.status(202).json({ 
      requestId, 
      message: 'File uploaded successfully. Processing has begun.' 
    });
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'File upload failed', details: error.message });
  }
});

export const fileRouter = router;