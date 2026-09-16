/**
 * Member 1 Contract: File Service
 * Responsible for handling file storage and providing read streams for datasets.
 *
 * Member 2 consumes getReadStream(datasetId) to stream records directly
 * into the ETL pipeline without loading full files into memory.
 */
async function getReadStream(datasetId) {
  // Member 1 implementation will return a Readable stream for the given datasetId.
  // Example: fs.createReadStream(filePath)
  // Note: Never use fs.readFile() for large datasets; always stream.
  throw new Error("getReadStream not yet implemented by Member 1");
}

module.exports = {
  getReadStream
};
