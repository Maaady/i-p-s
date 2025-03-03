# Database Schema

## Overview

The Image Processing System uses MongoDB as its database. The schema is designed to efficiently track processing requests and store product information with their associated images.

## Collections

### Requests Collection

Stores information about each processing request.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  requestId: String,            // UUID for the request
  status: String,               // 'pending', 'processing', 'completed', or 'failed'
  totalItems: Number,           // Total number of products to process
  processedItems: Number,       // Number of products processed so far
  createdAt: Date,              // When the request was created
  updatedAt: Date,              // When the request was last updated
  originalFileName: String,     // Name of the uploaded CSV file
  outputFileName: String,       // Name of the generated output CSV file
  webhookUrl: String            // Optional URL to notify when processing is complete
}
```

#### Indexes:

- `requestId`: Unique index for fast lookups by request ID

### Products Collection

Stores information about each product and its associated images.

```javascript
{
  _id: ObjectId,                // MongoDB generated ID
  requestId: String,            // UUID of the associated request
  serialNumber: Number,         // Serial number from the CSV
  productName: String,          // Name of the product
  inputImageUrls: [String],     // Array of original image URLs
  outputImageUrls: [String],    // Array of processed image URLs
  status: String,               // 'pending', 'processing', 'completed', or 'failed'
  createdAt: Date,              // When the product record was created
  updatedAt: Date               // When the product record was last updated
}
```

#### Indexes:

- `requestId`: Index for fast lookups of products by request ID
- `requestId_serialNumber`: Compound index for sorting products by serial number within a request

## Relationships

- One-to-many relationship between Requests and Products
- Each Request can have multiple Products
- Each Product belongs to exactly one Request

## Data Flow

1. When a CSV file is uploaded, a new Request document is created with status 'pending'
2. As the CSV is parsed, Product documents are created for each row
3. The Request status is updated to 'processing'
4. As images are processed, the outputImageUrls array is populated for each Product
5. When all images for a Product are processed, its status is updated to 'completed'
6. When all Products are processed, the Request status is updated to 'completed'
7. If any errors occur, the relevant status is set to 'failed'

## Example Documents

### Request Document Example

```javascript
{
  "_id": ObjectId("5f8d0d55b54764421b719059"),
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "totalItems": 2,
  "processedItems": 1,
  "createdAt": ISODate("2023-01-01T12:00:00Z"),
  "updatedAt": ISODate("2023-01-01T12:05:00Z"),
  "originalFileName": "products.csv",
  "outputFileName": null,
  "webhookUrl": "https://example.com/webhook"
}
```

### Product Document Example

```javascript
{
  "_id": ObjectId("5f8d0d55b54764421b71905a"),
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "serialNumber": 1,
  "productName": "SKU1",
  "inputImageUrls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.jpg"
  ],
  "outputImageUrls": [
    "https://example.com/processed1.jpg",
    ""  // Second image not yet processed
  ],
  "status": "processing",
  "createdAt": ISODate("2023-01-01T12:00:00Z"),
  "updatedAt": ISODate("2023-01-01T12:03:00Z")
}
```

## Schema Design Considerations

### Scalability

- Separate collections for Requests and Products allow for efficient querying and updates
- Indexes on frequently queried fields optimize performance
- Array fields for image URLs support variable numbers of images per product

### Data Integrity

- Status fields track the progress of processing
- Timestamps record when records are created and updated
- Reference between Requests and Products maintained via requestId

### Query Patterns

The schema is optimized for the following common query patterns:

1. Retrieving a request by its requestId
2. Finding all products for a specific request
3. Counting processed items for a request
4. Sorting products by serialNumber within a request

## Future Considerations

As the system scales, consider:

1. Implementing sharding for the Products collection if the number of products grows significantly
2. Adding TTL (Time To Live) indexes to automatically remove old requests after a certain period
3. Implementing capped collections or a separate collection for logging processing events