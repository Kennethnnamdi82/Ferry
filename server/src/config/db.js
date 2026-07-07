import mongoose from 'mongoose';
import { getEnv } from './env.js';

export default async function connectDB() {
  const uri = getEnv('MONGO_URI');
  if (!uri) throw new Error('MONGO_URI missing');
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 10000),
  });
  console.log('MongoDB connected');
}
