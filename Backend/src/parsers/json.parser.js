import { Transform } from "stream";

/**
 * Streaming JSON Array Parser
 * Incremental parsing for JSON array formatted data:
 * [
 *   { "name": "Gaurav", "age": 21 },
 *   { "name": "Akshat", "age": 22 }
 * ]
 *
 * Requirements satisfied:
 * - Incremental chunk-by-chunk processing with backpressure support
 * - Constant O(1) memory footprint for multi-GB datasets
 * - Never calls fs.readFile or JSON.parse on the entire dataset
 * - Supports large arrays, nested objects, missing fields, and null values
 * - Detects malformed/invalid records (e.g. primitives/null inside array) without crashing
 */
export class JsonArrayParserStream extends Transform {
  constructor(options = {}) {
    super({
      ...options,
      readableObjectMode: true,
      writableObjectMode: false
    });

    this.inArray = false;
    this.depth = 0;
    this.inString = false;
    this.escape = false;
    this.buffer = "";
    this.primitiveBuffer = "";
    this.rowNumber = 0;
    this.options = options;
  }

  _transform(chunk, encoding, callback) {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const len = text.length;

    for (let i = 0; i < len; i++) {
      const char = text[i];

      // Wait until top-level array start '[' is encountered
      if (!this.inArray) {
        if (char === "[") {
          this.inArray = true;
        }
        continue;
      }

      // Handle string literal state
      if (this.inString) {
        if (this.depth > 0) {
          this.buffer += char;
        } else {
          this.primitiveBuffer += char;
        }

        if (this.escape) {
          this.escape = false;
        } else if (char === "\\") {
          this.escape = true;
        } else if (char === '"') {
          this.inString = false;
        }
        continue;
      }

      if (char === '"') {
        this.inString = true;
        if (this.depth > 0) {
          this.buffer += char;
        } else {
          this.primitiveBuffer += char;
        }
        continue;
      }

      if (char === "{") {
        // If we had buffered non-object primitive content before '{', process it
        this._flushPrimitiveBuffer();
        this.depth++;
        this.buffer += char;
        continue;
      }

      if (char === "}") {
        this.depth--;
        this.buffer += char;

        if (this.depth === 0) {
          this.rowNumber++;
          this._processBuffer(this.buffer, this.rowNumber);
          this.buffer = "";
        }
        continue;
      }

      if (this.depth > 0) {
        this.buffer += char;

        // Protection against malformed JSON with missing closing brace
        const maxObjectSize = this.options.maxObjectSize || 512 * 1024; // 512 KB max single object
        if (this.buffer.length > maxObjectSize) {
          this.rowNumber++;
          const malformed = {
            _isMalformed: true,
            rowNumber: this.rowNumber,
            error: {
              type: "OVERSIZED_OR_UNCLOSED_OBJECT",
              message: `JSON object exceeded maximum allowed buffer (${maxObjectSize} bytes) without closing brace`
            },
            raw: this.buffer.substring(0, 200) + "..."
          };
          this.emit("malformedRecord", malformed);
          this.push(malformed);
          this.buffer = "";
          this.depth = 0;
        }
      } else if (char === "]") {
        this._flushPrimitiveBuffer();
        this.inArray = false;
      } else if (char === ",") {
        this._flushPrimitiveBuffer();
      } else if (!/\s/.test(char)) {
        // Collect non-whitespace characters outside of objects (primitives like null, numbers, booleans)
        this.primitiveBuffer += char;
      }
    }

    callback();
  }

  _flushPrimitiveBuffer() {
    const raw = this.primitiveBuffer.trim();
    this.primitiveBuffer = "";
    if (raw.length === 0) return;

    this.rowNumber++;
    try {
      const val = JSON.parse(raw);
      const malformed = {
        _isMalformed: true,
        rowNumber: this.rowNumber,
        error: {
          type: "INVALID_RECORD_TYPE",
          message: `Array element is not a JSON object (got ${val === null ? 'null' : typeof val})`
        },
        raw
      };
      this.emit("malformedRecord", malformed);
      this.push(malformed);
    } catch (err) {
      const malformed = {
        _isMalformed: true,
        rowNumber: this.rowNumber,
        error: {
          type: "MALFORMED_JSON_VALUE",
          message: err.message
        },
        raw
      };
      this.emit("malformedRecord", malformed);
      this.push(malformed);
    }
  }

  _flush(callback) {
    this._flushPrimitiveBuffer();

    // If stream ended with unclosed object or trailing content
    if (this.depth > 0 || (this.buffer.trim().length > 0 && this.buffer.trim() !== "]")) {
      this.rowNumber++;
      const malformed = {
        _isMalformed: true,
        rowNumber: this.rowNumber,
        error: {
          type: "UNCLOSED_JSON_OBJECT",
          message: "Stream terminated unexpectedly while parsing JSON object"
        },
        raw: this.buffer.trim()
      };
      this.emit("malformedRecord", malformed);
      this.push(malformed);
    }
    callback();
  }

  _processBuffer(rawJson, rowNumber) {
    try {
      const record = JSON.parse(rawJson);
      if (typeof record === "object" && record !== null) {
        record._rowNumber = rowNumber;
        this.push(record);
      } else {
        const malformed = {
          _isMalformed: true,
          rowNumber,
          error: {
            type: "INVALID_RECORD_TYPE",
            message: "JSON element is not a valid object"
          },
          raw: rawJson
        };
        this.emit("malformedRecord", malformed);
        this.push(malformed);
      }
    } catch (err) {
      const malformed = {
        _isMalformed: true,
        rowNumber,
        error: {
          type: "MALFORMED_JSON_OBJECT",
          message: err.message
        },
        raw: rawJson
      };
      this.emit("malformedRecord", malformed);
      this.push(malformed);
    }
  }
}

export function createJSONParserStream(options = {}) {
  return new JsonArrayParserStream(options);
}

export default {
  JsonArrayParserStream,
  createJSONParserStream
};
