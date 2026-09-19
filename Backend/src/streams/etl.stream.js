const { Transform } = require("stream");

/**
 * Creates the core ETL Transform Stream.
 * Stage responsibilities:
 * - Operates in objectMode
 * - Receives parsed records
 * - Performs basic sanitization and normalization
 * - Preserves streaming backpressure
 * - Passes processed record forward
 *
 * @param {object} [options]
 * @param {function} [options.transformFn] Optional custom transform function for testing
 * @returns {Transform}
 */
function createETLTransform(options = {}) {
  return new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // If the incoming record is already marked as malformed from the parser, pass it through directly
      if (record && record._isMalformed) {
        return callback(null, record);
      }

      try {
        // Perform basic processing / normalization
        const processed = { ...record };

        // Trim string values
        for (const [key, val] of Object.entries(processed)) {
          if (typeof val === "string") {
            processed[key] = val.trim();
          }
        }

        // Apply custom transform function if provided
        if (typeof options.transformFn === "function") {
          const transformed = options.transformFn(processed);
          return callback(null, transformed);
        }

        // Add internal processing timestamp metadata
        processed._processedAt = new Date().toISOString();

        callback(null, processed);
      } catch (err) {
        // Wrap unexpected transform error as malformed/failed row
        const failedRecord = {
          _isMalformed: true,
          rowNumber: record ? record._rowNumber : null,
          error: {
            type: "TRANSFORM_ERROR",
            message: err.message
          },
          raw: record
        };
        callback(null, failedRecord);
      }
    }
  });
}

module.exports = {
  createETLTransform
};

