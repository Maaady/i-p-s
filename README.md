# Image Processing System
[![Next.js](https://img.shields.io/badge/Next.js-5.5.3-green.svg)](https://www.next.jslang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-5.5.3-yellow.svg)](https://www.node.jslang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-brown.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-5.5.3-blue.svg)](https://www.reactlang.org/)

A system to efficiently process image data from CSV files, compress images, and generate output reports and analyzes digital images using various algorithms and techniques. The core goal is to enhance image quality, extract meaningful information, and automate image-based tasks. 

## Features

- CSV file upload and validation
- Asynchronous image processing (50% compression)
- Request tracking with unique IDs
- Status checking API
- Webhook notifications
- Output CSV generation

## System Architecture

### Components

1. **API Layer**
   - Upload API: Accepts CSV files and returns a request ID
   - Status API: Checks processing status using the request ID
   - Webhook API: Handles callbacks from the image processing service

2. **Processing Layer**
   - CSV Parser: Validates and extracts data from input files
   - Image Processor: Downloads and compresses images
   - Output Generator: Creates the output CSV with processed image URLs

3. **Database Layer**
   - Request Tracking: Stores request metadata and status
   - Product Storage: Maintains product data with input and output image URLs

4. **Frontend**
   - File Upload Interface
   - Status Tracking Dashboard

## Database Schema

### Request Collection

```
{
  requestId: String,
  status: String (pending, processing, completed, failed),
  totalItems: Number,
  processedItems: Number,
  createdAt: Date,
  updatedAt: Date,
  originalFileName: String,
  outputFileName: String,
  webhookUrl: String
}
```

### Product Collection

```
{
  requestId: String,
  serialNumber: Number,
  productName: String,
  inputImageUrls: [String],
  outputImageUrls: [String],
  status: String (pending, processing, completed, failed),
  createdAt: Date,
  updatedAt: Date
}
```

## API Documentation

### Upload API

**Endpoint:** `POST /api/upload`

**Request:**
- Content-Type: multipart/form-data
- Body:
  - file: CSV file (required)
  - webhookUrl: URL for notification when processing completes (optional)

**Response:**
```json
{
  "requestId": "uuid-string",
  "message": "File uploaded successfully. Processing has begun."
}
```

### Status API

**Endpoint:** `GET /api/status/:requestId`

**Response:**
```json
{
  "requestId": "uuid-string",
  "status": "processing",
  "progress": 45,
  "totalItems": 10,
  "processedItems": 4,
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:05:00Z",
  "outputFileName": null
}
```

### Results API

**Endpoint:** `GET /api/status/:requestId/results`

**Response:**
```json
{
  "requestId": "uuid-string",
  "status": "completed",
  "totalItems": 2,
  "products": [
    {
      "serialNumber": 1,
      "productName": "SKU1",
      "inputImageUrls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
      "outputImageUrls": ["https://example.com/processed1.jpg", "https://example.com/processed2.jpg"],
      "status": "completed"
    },
    {
      "serialNumber": 2,
      "productName": "SKU2",
      "inputImageUrls": ["https://example.com/image3.jpg"],
      "outputImageUrls": ["https://example.com/processed3.jpg"],
      "status": "completed"
    }
  ],
  "outputFileName": "output-uuid-string.csv"
}
```

### Webhook Callback

**Endpoint:** `POST /api/webhook/callback`

**Request:**
```json
{
  "requestId": "uuid-string",
  "productId": "product-id",
  "imageIndex": 0,
  "outputUrl": "https://example.com/processed1.jpg",
  "success": true
}
```

**Response:**
```json
{
  "message": "Webhook processed successfully"
}
```

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables in `.env` file:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/image-processor
   ```
4. Start the development server:
   ```
   npm run dev
   ```

## Usage

1. Access the web interface at `http://localhost:3000`
2. Upload a CSV file with the required format
3. Receive a request ID
4. Check the processing status using the request ID
5. Download the output CSV when processing is complete

## CSV Format

### Input CSV Format

```
S. No.,Product Name,Input Image Urls
1,SKU1,https://example.com/image1.jpg,https://example.com/image2.jpg
2,SKU2,https://example.com/image3.jpg
```

### Output CSV Format

```
S. No.,Product Name,Input Image Urls,Output Image Urls
1,SKU1,"https://example.com/image1.jpg, https://example.com/image2.jpg","https://example.com/processed1.jpg, https://example.com/processed2.jpg"
2,SKU2,"https://example.com/image3.jpg","https://example.com/processed3.jpg"
```
