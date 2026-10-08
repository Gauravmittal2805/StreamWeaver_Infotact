import { getDB } from '../config/db.js';

export const DATASET_COLLECTION = 'datasets';

/**
 * Initializes indexes for Dataset collection.
 */
export async function initDatasetIndexes() {
  try {
    const db = getDB();
    const collection = db.collection(DATASET_COLLECTION);
    await collection.createIndex({ id: 1 }, { unique: true });
    await collection.createIndex({ status: 1 });
    await collection.createIndex({ uploadedAt: -1 });
  } catch (err) {
    // DB may be offline in test mode
  }
}

export default {
  DATASET_COLLECTION,
  initDatasetIndexes
};
