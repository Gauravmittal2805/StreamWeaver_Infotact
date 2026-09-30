import { Transform } from 'stream';
import { transformRecord } from '../utils/transformation.utils.js';

/**
 * Creates a streaming Mapping & Transformation Processor.
 * Responsibilities:
 * - Operates in objectMode: true
 * - Transforms records item-by-item incrementally inside the stream without buffering arrays in memory
 * - Maps source fields to destination fields according to mappingConfig
 * - Applies configured transformations (Uppercase, Lowercase, Trim, Number, Replace, Prefix, Suffix, Default Value, Custom JS)
 * - Enforces unmapped fields rule: Only mapped fields passed to destination by default (unless unmappedFieldsMode === 'keep')
 * - Enforces missing values rule: Null/undefined/missing source values handled gracefully
 * - Preserves stream backpressure
 *
 * @param {object} mappingConfig - { mappings: [{ sourceField, destinationField, transformation, transformConfig }], unmappedFieldsMode: 'ignore'|'keep' }
 * @returns {Transform}
 */
export function createMappingTransform(mappingConfig) {
  const mappings = (mappingConfig && Array.isArray(mappingConfig.mappings)) ? mappingConfig.mappings : [];
  const unmappedFieldsMode = (mappingConfig && mappingConfig.unmappedFieldsMode) || 'ignore';

  return new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      if (!record || typeof record !== 'object') {
        return callback(null, record);
      }

      if (record._isMalformed) {
        return callback(null, record);
      }

      // If no mappings configured, pass original record through
      if (mappings.length === 0) {
        record._isMapped = true;
        return callback(null, record);
      }

      const resultRecord = transformRecord(record, mappings, unmappedFieldsMode);
      callback(null, resultRecord);
    }
  });
}

export default {
  createMappingTransform
};
