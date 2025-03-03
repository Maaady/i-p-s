# System Architecture

## Overview

The Image Processing System is designed to efficiently handle the processing of images from CSV files. The system follows a modular architecture with clear separation of concerns, making it scalable and maintainable.

## Architecture Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Client/User    │────▶│   API Layer     │────▶│  CSV Parser     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Output CSV     │◀────│  Database       │◀────│  Image          │
│  Generator      │     │  (MongoDB)      │     │  Processor      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                                │
        │                                                │
        ▼                                                ▼
┌─────────────────┐                            ┌─────────────────┐
│                 │                            │                 │
│  Webhook        │◀───────────────────────────│  External       │
│  Notifier       │                            │  Storage        │
│                 │                            │                 │
└─────────────────┘                            └─────────────────┘
```

## Components

### 1. API Layer

The API layer serves as the entry point for client requests and provides the following endpoints:

- **Upload API**: Accepts CSV files, validates them, and initiates the processing pipeline
- **Status API**: Allows clients to check the status of their processing requests
- **Results API**: Provides detailed results for completed requests
- **Webhook API**: Handles callbacks from the image processing service

### 2. CSV Parser

The CSV Parser is responsible for:

- Validating the structure of the uploaded CSV file
- Extracting product and image information
- Creating database records for each product and its associated images

### 3. Image Processor

The Image Processor handles:

- Downloading images from the provided URLs
- Compressing images to 50% of their original quality
- Storing processed images
- Updating the database with processed image information

### 4. Database (MongoDB)

The database stores:

- Request metadata and status information
- Product details including input and output image URLs
- Processing status for individual products and images

### 5. Output CSV Generator

This component:

- Creates the output CSV file with the required format
- Includes both input and output image URLs
- Makes the file available for download

### 6. Webhook Notifier

The Webhook Notifier:

- Sends notifications to client-provided webhook URLs
- Provides processing status updates
- Notifies when processing is complete

## Data Flow

1. Client uploads a CSV file through the Upload API
2. System validates the CSV and returns a request ID
3. CSV Parser extracts product and image information
4. Image Processor downloads and processes each image
5. Database is updated with processing status
6. Output CSV Generator creates the final output file
7. Webhook Notifier sends completion notification if a webhook URL was provided
8. Client can check status and download results through the Status API

## Scalability Considerations

- **Asynchronous Processing**: All image processing is done asynchronously to handle large volumes
- **Modular Design**: Components are loosely coupled for easy scaling
- **Database Indexing**: Proper indexing for efficient queries
- **Stateless API**: API endpoints are stateless for horizontal scaling

## Security Considerations

- **Input Validation**: All user inputs are validated
- **File Size Limits**: Restrictions on CSV file sizes
- **URL Validation**: Validation of image URLs before processing
- **Error Handling**: Comprehensive error handling throughout the system