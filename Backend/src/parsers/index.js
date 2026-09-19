const { createParserStream, UnsupportedFormatError } = require("./parser.factory");
const { createCSVParserStream } = require("./csv.parser");
const { createJSONParserStream, JsonArrayParserStream } = require("./json.parser");

module.exports = {
  createParserStream,
  UnsupportedFormatError,
  createCSVParserStream,
  createJSONParserStream,
  JsonArrayParserStream
};
