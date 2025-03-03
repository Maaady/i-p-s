import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  requestId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  totalItems: {
    type: Number,
    default: 0
  },
  processedItems: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  originalFileName: String,
  outputFileName: String,
  webhookUrl: String
}, { timestamps: true });

export const Request = mongoose.model('Request', requestSchema);