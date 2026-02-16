#!/usr/bin/env node
/**
 * Migration: Rename question type 'puzzle' to 'sort'
 * Run: node scripts/migrate-puzzle-to-sort.js
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/answr';

async function migrate() {
  try {
    await mongoose.connect(MONGODB_URI);
    const result = await mongoose.connection.db
      .collection('questions')
      .updateMany({ type: 'puzzle' }, { $set: { type: 'sort' } });
    console.log('Migration complete:', result.matchedCount, 'matched,', result.modifiedCount, 'modified');
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

migrate();
