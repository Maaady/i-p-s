import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileRouter } from './routes/fileRoutes.js';
import { statusRouter } from './routes/statusRoutes.js';
import { webhookRouter } from './routes/webhookRoutes.js';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const processedDir = path.join(uploadsDir, 'processed');
if (!fs.existsSync(processedDir)) {
  fs.mkdirSync(processedDir, { recursive: true });
}

// Connect to MongoDB with fallback
let dbConnected = false;

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/image-processor')
  .then(() => {
    console.log('Connected to MongoDB');
    dbConnected = true;
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
    console.log('Running in memory-only mode (data will not persist after restart)');
    
    // Set up global in-memory storage as fallback
    global.inMemoryDB = {
      requests: [],
      products: [],
      getRequestById: (requestId) => global.inMemoryDB.requests.find(r => r.requestId === requestId),
      getProductsByRequestId: (requestId) => global.inMemoryDB.products.filter(p => p.requestId === requestId),
      addRequest: (request) => {
        global.inMemoryDB.requests.push(request);
        return request;
      },
      addProducts: (products) => {
        global.inMemoryDB.products.push(...products);
        return products;
      },
      updateRequest: (requestId, updates) => {
        const index = global.inMemoryDB.requests.findIndex(r => r.requestId === requestId);
        if (index !== -1) {
          global.inMemoryDB.requests[index] = { ...global.inMemoryDB.requests[index], ...updates };
          return global.inMemoryDB.requests[index];
        }
        return null;
      },
      updateProduct: (productId, updates) => {
        const index = global.inMemoryDB.products.findIndex(p => p._id === productId);
        if (index !== -1) {
          global.inMemoryDB.products[index] = { ...global.inMemoryDB.products[index], ...updates };
          return global.inMemoryDB.products[index];
        }
        return null;
      }
    };
  });

// Make database connection status available to routes
app.use((req, res, next) => {
  req.dbConnected = dbConnected;
  next();
});

// Routes
app.use('/api/upload', fileRouter);
app.use('/api/status', statusRouter);
app.use('/api/webhook', webhookRouter);

// Frontend route for the React app
app.use(express.static('dist'));

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});