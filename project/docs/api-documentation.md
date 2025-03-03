# API Documentation

## Overview

The Image Processing System provides a set of RESTful APIs for uploading CSV files, processing images, and retrieving results. This document outlines the available endpoints, request/response formats, and usage examples.

## Base URL

All API endpoints are relative to the base URL:

```
http://localhost:3000/api
```

## Authentication

Currently, the API does not require authentication. In a production environment, you would want to implement proper authentication and authorization.

## Endpoints

### Upload CSV File

Uploads a CSV file containing product and image information for processing.

**URL**: `/upload`

**Method**: `POST`

**Content-Type**: `multipart/form-data`

**Request Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| file | File | Yes | CSV file containing product and image data |
| webhookUrl | String | No | URL to notify when processing is complete |

**Response**:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "File uploaded successfully. Processing has begun."
}
```

**Status Codes**:

| Status Code | Description |
|-------------|-------------|
| 202 | Accepted - File uploaded and processing started |
| 400 | Bad Request - Invalid file format or missing file |
| 500 | Internal Server Error |

**Example**:

```bash
curl -X POST \
  http://localhost:3000/api/upload \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@/path/to/products.csv' \
  -F 'webhookUrl=https://example.com/webhook'
```

### Check Processing Status

Retrieves the current status of a processing request.

**URL**: `/status/:requestId`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| requestId | String | Yes | Unique identifier for the processing request |

**Response**:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "totalItems": 10,
  "processedItems": 4,
  "createdAt": "2023-01-01T12:00:00Z",
  "updatedAt": "2023-01-01T12:05:00Z",
  "outputFileName": null
}
```

**Status Codes**:

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Status retrieved successfully |
| 404 | Not Found - Request ID not found |
| 500 | Internal Server Error |

**Example**:

```bash
curl -X GET \
  http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000
```

### Get Processing Results

Retrieves detailed results for a completed processing request.

**URL**: `/status/:requestId/results`

**Method**: `GET`

**URL Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| requestId | String | Yes | Unique identifier for the processing request |

**Response**:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "totalItems": 2,
  "products": [
    {
      "serialNumber": 1,
      "productName": "SKU1",
      "inputImageUrls": [
        "https://example.com/image1.jpg",
        "https://example.com/image2.jpg"
      ],
      "outputImageUrls": [
        "https://example.com/processed1.jpg",
        "https://example.com/processed2.jpg"
      ],
      "status": "completed"
    },
    {
      "serialNumber": 2,
      "productName": "SKU2",
      "inputImageUrls": [
        "https://example.com/image3.jpg"
      ],
      "outputImageUrls": [
        "https://example.com/processed3.jpg"
      ],
      "status": "completed"
    }
  ],
  "outputFileName": "output-550e8400-e29b-41d4-a716-446655440000.csv"
}
```

**Status Codes**:

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Results retrieved successfully |
| 400 | Bad Request - Processing not completed |
| 404 | Not Found - Request ID not found |
| 500 | Internal Server Error |

**Example**:

```bash
curl -X GET \
  http://localhost:3000/api/status/550e8400-e29b-41d4-a716-446655440000/results
```

### Webhook Callback

This is an internal endpoint used by the image processing service to update the status of processed images.

**URL**: `/webhook/callback`

**Method**: `POST`

**Content-Type**: `application/json`

**Request Body**:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "productId": "5f8d0d55b54764421b71905a",
  "imageIndex": 0,
  "outputUrl": "https://example.com/processed1.jpg",
  "success": true
}
```

**Response**:

```json
{
  "message": "Webhook processed successfully"
}
```

**Status Codes**:

| Status Code | Description |
|-------------|-------------|
| 200 | OK - Webhook processed successfully |
| 400 | Bad Request - Missing required parameters |
| 404 | Not Found - Product not found |
| 500 | Internal Server Error |

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## CSV File Format

### Input CSV Format

The system expects CSV files with the following columns:

1. `S. No.` - Serial number
2. `Product Name` - Name of the product
3. `Input Image Urls` - Comma-separated list of image URLs

Example:

```
S. No.,Product Name,Input Image Urls
1,SKU1,"https://example.com/image1.jpg, https://example.com/image2.jpg"
2,SKU2,"https://example.com/image3.jpg"
```

### Output CSV Format

The system generates output CSV files with the following columns:

1. `S. No.` - Serial number
2. `Product Name` - Name of the product
3. `Input Image Urls` - Comma-separated list of original image URLs
4. `Output Image Urls` - Comma-separated list of processed image URLs

Example:

```
S. No.,Product Name,Input Image Urls,Output Image Urls
1,SKU1,"https://example.com/image1.jpg, https://example.com/image2.jpg","https://example.com/processed1.jpg, https://example.com/processed2.jpg"
2,SKU2,"https://example.com/image3.jpg","https://example.com/processed3.jpg"
```

## Rate Limiting

Currently, there are no rate limits implemented. In a production environment, consider implementing rate limiting to prevent abuse.

## Webhook Integration

When providing a webhook URL, your endpoint should be prepared to receive a POST request with the following JSON payload when processing is complete:

```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "outputFileName": "output-550e8400-e29b-41d4-a716-446655440000.csv"
}
```

Your webhook endpoint should respond with a 200 status code to acknowledge receipt.