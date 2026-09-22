import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DATA_DIR = path.join(__dirname, "data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * Generates a test CSV file incrementally using streams.
 *
 * @param {string} filename 
 * @param {number} rowCount 
 * @param {object} options
 * @param {number} [options.malformedInterval=0] If > 0, injects a malformed row every N rows
 * @returns {Promise<string>} File path
 */
export async function generateTestCSV(filename, rowCount, options = {}) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const writeStream = fs.createWriteStream(filePath, { encoding: "utf8", highWaterMark: 64 * 1024 });
  const malformedInterval = options.malformedInterval || 0;

  return new Promise((resolve, reject) => {
    let i = 0;
    let buffer = "id,name,email,age,city\n";
    const CHUNK_SIZE = 500;

    function writeChunk() {
      let ok = true;
      while (i < rowCount && ok) {
        for (let c = 0; c < CHUNK_SIZE && i < rowCount; c++) {
          i++;
          if (malformedInterval > 0 && i % malformedInterval === 0) {
            buffer += `${i},User_${i},user${i}@example.com,${20 + (i % 50)},City_${i},EXTRA_COL_UNEXPECTED\n`;
          } else {
            buffer += `${i},User_${i},user${i}@example.com,${20 + (i % 50)},City_${i}\n`;
          }
        }

        if (i >= rowCount) {
          writeStream.write(buffer, () => {
            writeStream.end();
            resolve(filePath);
          });
          return;
        } else {
          ok = writeStream.write(buffer);
          buffer = "";
        }
      }

      if (i < rowCount) {
        writeStream.once("drain", writeChunk);
      }
    }

    writeStream.on("error", reject);
    writeChunk();
  });
}

export async function generateTestJSON(filename, rowCount, options = {}) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const writeStream = fs.createWriteStream(filePath, { encoding: "utf8", highWaterMark: 64 * 1024 });
  const malformedInterval = options.malformedInterval || 0;

  return new Promise((resolve, reject) => {
    let i = 0;
    let buffer = "[\n";
    const CHUNK_SIZE = 500;

    function writeChunk() {
      let ok = true;
      while (i < rowCount && ok) {
        for (let c = 0; c < CHUNK_SIZE && i < rowCount; c++) {
          i++;
          const comma = i === rowCount ? "\n" : ",\n";
          if (malformedInterval > 0 && i % malformedInterval === 0) {
            // Malformed JSON object syntax
            buffer += `  {"id": ${i}, "name": "Broken_${i}", invalid_key_unquoted: undefined_value}${comma}`;
          } else {
            buffer += `  {"id": ${i}, "name": "User_${i}", "email": "user${i}@example.com", "age": ${20 + (i % 50)}, "city": "City_${i}"}${comma}`;
          }
        }

        if (i >= rowCount) {
          writeStream.write(buffer + "]", () => {
            writeStream.end();
            resolve(filePath);
          });
          return;
        } else {
          ok = writeStream.write(buffer);
          buffer = "";
        }
      }

      if (i < rowCount) {
        writeStream.once("drain", writeChunk);
      }
    }

    writeStream.on("error", reject);
    writeChunk();
  });
}

export default {
  DATA_DIR,
  generateTestCSV,
  generateTestJSON
};
