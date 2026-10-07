import { getDB } from '../config/db.js';

export const JOB_COLLECTION = 'jobs';

/**
 * Initializes indexes for Job collection.
 */
export async function initJobIndexes() {
  try {
    const db = getDB();
    const collection = db.collection(JOB_COLLECTION);
    await collection.createIndex({ jobId: 1 }, { unique: true });
    await collection.createIndex({ datasetId: 1 });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ createdAt: -1 });
  } catch (err) {
    // DB may be offline in test mode
  }
}

export default {
  JOB_COLLECTION,
  initJobIndexes
};
