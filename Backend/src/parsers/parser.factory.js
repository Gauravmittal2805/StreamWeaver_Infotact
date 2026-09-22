import { createCSVParserStream } from "./csv.parser.js";
import { createJSONParserStream } from "./json.parser.js";

export class UnsupportedFormatError extends Error {
  constructor(format) {
    super(`Unsupported dataset format: '${format}'. StreamWeaver currently supports 'csv' and 'json'.`);
    this.name = "UnsupportedFormatError";
    this.format = format;
  }
}

/**
 * Common Parser Factory
 * Exposes a unified interface so the downstream ETL engine is format-agnostic.
 *
 * @param {string} format 'csv' | 'json'
 * @param {object} [options] Parser options
 * @returns {import('stream').Transform|import('stream').Duplex} An objectMode readable parser stream
 */
export function createParserStream(format, options = {}) {
  if (!format || typeof format !== "string") {
    throw new UnsupportedFormatError("undefined");
  }

  const normalizedFormat = format.trim().toLowerCase();

  switch (normalizedFormat) {
    case "csv":
      return createCSVParserStream(options);

    case "json":
      return createJSONParserStream(options);

    default:
      throw new UnsupportedFormatError(format);
  }
}

export default {
  createParserStream,
  UnsupportedFormatError
};
