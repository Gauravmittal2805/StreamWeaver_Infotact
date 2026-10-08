import { MongoClient } from 'mongodb';

let client;
let db;

export async function connectDB(force = false) {
  if (db && !force) {
    return db;
  }
  if (force && client) {
    try { await client.close(); } catch {}
    client = null;
    db = null;
  }
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017';
  const dbName = process.env.MONGO_DB_NAME || 'streamweaver';

  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);
  console.log(`[Database] MongoDB connected: ${dbName} (${mongoUri})`);
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
