const csvParser = require("csv-parser");
const { Transform } = require("stream");

/**
 * Creates a streaming CSV parser.
 * - Incremental processing, one record at a time.
 * - Entire CSV is never loaded into memory.
 * - Headers converted into object keys.
 * - Emits malformed row errors/records without crashing the pipeline.
 * - Preserves backpressure.
 *
 * @param {object} options
 * @param {Array<string>} [options.expectedHeaders] Optional list of expected headers
 * @param {boolean} [options.strict=false] If true, column count mismatches trigger malformed records
 * @returns {Transform}
 */
function createCSVParserStream(options = {}) {
  let rowNumber = 0;
  let headersDetected = null;

  const parser = csvParser({
    mapHeaders: ({ header }) => header ? header.trim() : "",
    strict: false,
    ...options
  });

  parser.on("headers", (headers) => {
    headersDetected = headers;
  });

  // Wrap with a transform stream to attach row numbers and inspect for malformed rows
  const validatorTransform = new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      rowNumber++;

      // Detect empty row or header row re-parse
      const keys = Object.keys(record);
      const isCompletelyEmpty = keys.length === 0 || keys.every((k) => !record[k] || record[k].trim() === "");

      if (isCompletelyEmpty) {
        // Skip empty lines
        return callback();
      }

      // Check for malformed rows if strict or if expected headers are defined
      let isMalformed = false;
      let errorMessage = "";

      if (options.expectedHeaders && Array.isArray(options.expectedHeaders)) {
        const missing = options.expectedHeaders.filter((h) => !(h in record));
        if (missing.length > 0) {
          isMalformed = true;
          errorMessage = `Missing expected headers: ${missing.join(", ")}`;
        }
      }

      // Check if any fields were unmapped or mismatched
      if (!isMalformed && headersDetected && headersDetected.length > 0) {
        // In CSV parser, extra columns beyond headers might be placed in empty string key or omitted
        if (record[""] !== undefined) {
          isMalformed = true;
          errorMessage = `Row has more columns than headers defined (${headersDetected.length})`;
        }
      }

      if (isMalformed) {
        const malformedRecord = {
          _isMalformed: true,
          rowNumber,
          error: {
            type: "MALFORMED_CSV_ROW",
            message: errorMessage
          },
          raw: record
        };
        validatorTransform.emit("malformedRecord", malformedRecord);
        return callback(null, malformedRecord);
      }

      // Valid record
      record._rowNumber = rowNumber;
      callback(null, record);
    }
  });

  // Handle errors from csvParser itself
  parser.on("error", (err) => {
    rowNumber++;
    const malformedRecord = {
      _isMalformed: true,
      rowNumber,
      error: {
        type: "CSV_PARSE_ERROR",
        message: err.message
      }
    };
    validatorTransform.emit("malformedRecord", malformedRecord);
    validatorTransform.write(malformedRecord);
  });

  // Pipe parser output through validatorTransform
  parser.pipe(validatorTransform);

  // Return a duplex-like or pipeable interface:
  // Writable side is `parser`, readable side is `validatorTransform`
  // We can return a Duplex stream combining them, or proxy pipe.
  const { Duplex } = require("stream");
  const duplex = Duplex.from({
    writable: parser,
    readable: validatorTransform
  });

  return duplex;
}

module.exports = {
  createCSVParserStream
};
