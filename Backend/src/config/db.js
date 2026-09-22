import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || 'streamweaver';

let client;
let db;

export async function connectDB() {
  if (db) {
    return db;
  }
  if (!mongoUri) {
    throw new Error('MONGO_URI is not defined');
  }
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);
  console.log(`MongoDB connected: ${dbName}`);
  return db;
}

export function getDB() {
  if (!db) {
    throw new Error('Database is not connected');
  }
  return db;
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

export default {
  connectDB,
  getDB,
  closeDB
};
