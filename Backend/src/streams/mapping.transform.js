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
        const transformed = {};

        // Preserve internal stream metadata properties starting with '_'
        for (const key of Object.keys(record)) {
          if (key.startsWith('_')) {
            transformed[key] = record[key];
          }
        }

        // If unmappedFieldsMode is 'keep', copy all original fields first
        if (unmappedFieldsMode === 'keep') {
          for (const [key, val] of Object.entries(record)) {
            if (!key.startsWith('_')) {
              transformed[key] = val;
            }
          }
        }

        // Apply mapping rules record by record
        for (const rule of mappings) {
          const { sourceField, destinationField } = rule;
          if (!sourceField || !destinationField) continue;

          // Step 11: Handle missing source values without crashing
          let value = record[sourceField];

          if (value === undefined || value === null) {
            value = null;
          } else if (typeof value === 'string') {
            const trimmed = value.trim();
            value = trimmed === '' ? null : trimmed;
          }

          transformed[destinationField] = value;
        }

        transformed._isMapped = true;
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
