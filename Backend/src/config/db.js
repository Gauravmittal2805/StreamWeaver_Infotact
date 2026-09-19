const { MongoClient } = require("mongodb");

const mongoUri = process.env.MONGO_URI;
const dbName = process.env.MONGO_DB_NAME || "streamweaver";

let client;
let db;

async function connectDB() {
  if (db) {
    return db;
  }
  if (!mongoUri) {
    throw new Error("MONGO_URI is not defined");
  }
  client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(dbName);
  console.log(`MongoDB connected: ${dbName}`);
  return db;
}

function getDB() {
  if (!db) {
    throw new Error("Database is not connected");
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = {
  connectDB,
  getDB,
  closeDB
};
