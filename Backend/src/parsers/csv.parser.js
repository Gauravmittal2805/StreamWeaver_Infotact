import csvParser from "csv-parser";
import { Transform, Duplex } from "stream";

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
 * @returns {Duplex}
 */
export function createCSVParserStream(options = {}) {
  let rowNumber = 0;
  let headersDetected = null;

  const parser = csvParser({
    mapHeaders: ({ header }) => (header ? header.trim() : ""),
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

      // Detect empty row
      const keys = Object.keys(record);
      const isCompletelyEmpty =
        keys.length === 0 || keys.every((k) => !record[k] || record[k].trim() === "");

      if (isCompletelyEmpty) {
        // Skip empty lines
        return callback();
      }

      // Check for malformed rows if strict or if expected headers are defined
      let isMalformed = false;
      let errorMessage = "";
      let failedField = null;

      if (options.expectedHeaders && Array.isArray(options.expectedHeaders)) {
        const missing = options.expectedHeaders.filter((h) => !(h in record));
        if (missing.length > 0) {
          isMalformed = true;
          failedField = missing[0];
          errorMessage = `Missing expected header: ${missing.join(", ")}`;
        }
      }

      // Check if any extra fields were unmapped or extra keys exist
      if (!isMalformed) {
        const extraKeys = Object.keys(record).filter((k) => k === "" || /^_\d+$/.test(k));
        if (extraKeys.length > 0) {
          isMalformed = true;
          errorMessage = `Row has more columns than headers defined (${headersDetected ? headersDetected.length : "unknown"})`;
        }
      }

      if (isMalformed) {
        const malformedRecord = {
          _isMalformed: true,
          rowNumber,
          field: failedField,
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

  const duplex = Duplex.from({
    writable: parser,
    readable: validatorTransform
  });

  return duplex;
}

export default {
  createCSVParserStream
};
