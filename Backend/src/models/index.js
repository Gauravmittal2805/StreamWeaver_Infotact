import { JOB_COLLECTION, initJobIndexes } from './job.model.js';
import { DATASET_COLLECTION, initDatasetIndexes } from './dataset.model.js';

export async function initDatabaseIndexes() {
  await Promise.allSettled([
    initJobIndexes(),
    initDatasetIndexes()
  ]);
}

export {
  JOB_COLLECTION,
  DATASET_COLLECTION,
  initJobIndexes,
  initDatasetIndexes
};

export default {
  initDatabaseIndexes,
  JOB_COLLECTION,
  DATASET_COLLECTION
};
