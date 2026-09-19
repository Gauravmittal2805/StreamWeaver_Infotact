const { Transform } = require("stream");

/**
 * Streaming JSON Array Parser
 * Incremental parsing for JSON array formatted data:
 * [
 *   { "name": "Gaurav", "age": 21 },
 *   { "name": "Akshat", "age": 22 }
 * ]
 *
 * Requirements satisfied:
 * - Incremental processing chunk by chunk
 * - Multi-GB files parsed with constant O(1) memory
 * - Never calls fs.readFile or JSON.parse on the entire dataset
 * - Detects malformed objects and handles them without crashing
 * - Maintains stream backpressure
 */
class JsonArrayParserStream extends Transform {
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
        this.buffer += char;
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
        }
        continue;
      }

      if (char === "{") {
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
        const maxObjectSize = this.options.maxObjectSize || 128 * 1024; // 128 KB max single object
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
        // End of array
        this.inArray = false;
      }
    }

    callback();
  }

  _flush(callback) {
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
      record._rowNumber = rowNumber;
      this.push(record);
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

function createJSONParserStream(options = {}) {
  return new JsonArrayParserStream(options);
}

module.exports = {
  JsonArrayParserStream,
  createJSONParserStream
};
