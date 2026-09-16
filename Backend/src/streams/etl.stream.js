const { Transform } = require("stream");

function createETLTransform() {
  return new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // Future:
      // mapping
      // transformation
      // validation

      callback(null, record);
    }
  });
}

module.exports = {
  createETLTransform
};
