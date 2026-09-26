import { Transform } from 'stream';

/**
 * Creates a streaming Mapping Transform Processor (Step 8 & Step 9).
 * Responsibilities:
 * - Operates in objectMode: true
 * - Transforms records item-by-item incrementally inside the stream without buffering arrays
 * - Maps source fields to destination fields according to mappingConfig
 * - Enforces Step 10 unmapped fields rule: Only mapped fields are passed to destination (unmapped fields ignored)
 * - Enforces Step 11 missing values rule: Null/undefined/missing source values do not crash processor
 * - Preserves stream backpressure
 *
 * @param {object} mappingConfig - { mappings: [{ sourceField, destinationField }], unmappedFieldsMode: 'ignore'|'keep' }
 * @returns {Transform}
 */
export function createMappingTransform(mappingConfig) {
  const mappings = (mappingConfig && Array.isArray(mappingConfig.mappings)) ? mappingConfig.mappings : [];
  const unmappedFieldsMode = (mappingConfig && mappingConfig.unmappedFieldsMode) || 'ignore';

  return new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // Step 8/9: Handle malformed or non-object records safely
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
        // Step 11: Wrap unexpected mapping transform error gracefully
        const failedRecord = {
          _isMalformed: true,
          _rowNumber: record._rowNumber || null,
          error: {
            type: 'MAPPING_TRANSFORM_ERROR',
            message: `Mapping failed: ${err.message}`
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
