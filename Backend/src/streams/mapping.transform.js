import { Transform } from 'stream';
import { transformRecord } from '../utils/transformation.utils.js';

/**
 * Creates a streaming Mapping & Transformation Processor.
 * Responsibilities:
 * - Operates in objectMode: true
 * - Transforms records item-by-item incrementally inside the stream without buffering arrays
 * - Maps source fields to destination fields according to mappingConfig
 * - Applies configured transformations (Uppercase, Lowercase, Trim, Number, Replace, etc.)
 * - Enforces unmapped fields rule: Only mapped fields are passed to destination (unmapped fields ignored by default)
 * - Enforces missing values rule: Null/undefined/missing source values do not crash processor
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

      try {
        const transformed = transformRecord(record, mappings, unmappedFieldsMode);
        callback(null, transformed);
      } catch (err) {
        const failedRecord = {
          _isMalformed: true,
          _rowNumber: record._rowNumber || null,
          error: {
            type: 'MAPPING_TRANSFORM_ERROR',
            message: `Mapping transformation failed: ${err.message}`
          },
          raw: record
        };
        callback(null, failedRecord);
      }
    }
  });
}

export default {
  createMappingTransform
};
