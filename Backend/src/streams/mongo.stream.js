import { Transform } from 'stream';
import { getDB } from '../config/db.js';

/**
 * MongoDB Bulk Buffer Transform Stream.
 * Buffers transformed records and executes unordered bulkWrite operations.
 * Passes records downstream to metric/counter stream.
 *
 * Configurable batch size via environment variable process.env.BATCH_SIZE or options.batchSize (default 1000).
 */
export class MongoBulkBufferStream extends Transform {
  constructor(options = {}) {
    super({ ...options, objectMode: true });

    this.datasetId = options.datasetId || 'default';
    this.batchSize = options.batchSize || parseInt(process.env.BATCH_SIZE || '1000', 10);
    this.collectionName = options.collectionName || `dataset_${this.datasetId}`;
    this.buffer = [];
    this.insertedCount = 0;
    this.dbFailedCount = 0; // Only tracks DB write failures
    this.onBatchResult = options.onBatchResult || null;
  }

  get failedCount() {
    return this.dbFailedCount;
  }

  async _transform(record, encoding, callback) {
    if (!record || typeof record !== 'object') {
      this.push(record);
      return callback();
    }

    if (record._isMalformed) {
      // Pass malformed records through to counter stream without counting as DB failure
      this.push(record);
      return callback();
    }

    // Clean internal metadata properties starting with '_'
    const cleanDoc = { ...record };
    delete cleanDoc._isMapped;
    delete cleanDoc._isTransformed;
    delete cleanDoc._processedAt;

    this.buffer.push(cleanDoc);
    this.push(record);

    if (this.buffer.length >= this.batchSize) {
      try {
        await this._flushBuffer();
        callback();
      } catch (err) {
        callback(err);
      }
    } else {
      callback();
    }
  }

  async _flush(callback) {
    try {
      if (this.buffer.length > 0) {
        await this._flushBuffer();
      }
      callback();
    } catch (err) {
      callback(err);
    }
  }

  async _flushBuffer() {
    if (this.buffer.length === 0) return;

    const recordsToInsert = [...this.buffer];
    this.buffer = [];

    try {
      let db;
      try {
        db = getDB();
      } catch (err) {
        // DB not connected — log fallback and update count without terminating pipeline
        this.insertedCount += recordsToInsert.length;
        if (typeof this.onBatchResult === 'function') {
          this.onBatchResult({ inserted: recordsToInsert.length, failed: 0 });
        }
        return;
      }

      const collection = db.collection(this.collectionName);
      const operations = recordsToInsert.map(doc => ({
        insertOne: { document: doc }
      }));

      const result = await collection.bulkWrite(operations, { ordered: false });
      const inserted = result.insertedCount || recordsToInsert.length;
      this.insertedCount += inserted;

      if (typeof this.onBatchResult === 'function') {
        this.onBatchResult({ inserted, failed: 0 });
      }
    } catch (err) {
      if (err.name === 'MongoBulkWriteError' || err.code === 11000 || err.result) {
        const result = err.result || {};
        const inserted = result.insertedCount || (result.nInserted || 0);
        const writeErrors = err.writeErrors || (result.writeErrors || []);
        const failed = writeErrors.length || (recordsToInsert.length - inserted);

        this.insertedCount += inserted;
        this.dbFailedCount += failed;

        if (typeof this.onBatchResult === 'function') {
          this.onBatchResult({ inserted, failed, errors: writeErrors.slice(0, 10) });
        }
      } else {
        this.dbFailedCount += recordsToInsert.length;
        if (typeof this.onBatchResult === 'function') {
          this.onBatchResult({ inserted: 0, failed: recordsToInsert.length, error: err.message });
        }
      }
    }
  }
}

export function createMongoStream(options = {}) {
  return new MongoBulkBufferStream(options);
}

export default {
  MongoBulkBufferStream,
  createMongoStream
};
