import { createParserStream, UnsupportedFormatError } from "./parser.factory.js";
import { createCSVParserStream } from "./csv.parser.js";
import { createJSONParserStream, JsonArrayParserStream } from "./json.parser.js";

export {
  createParserStream,
  UnsupportedFormatError,
  createCSVParserStream,
  createJSONParserStream,
  JsonArrayParserStream
};

export default {
  createParserStream,
  UnsupportedFormatError,
  createCSVParserStream,
  createJSONParserStream,
  JsonArrayParserStream
};
