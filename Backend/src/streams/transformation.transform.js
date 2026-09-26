import { Transform } from 'stream';
import { normalizeTransformationType } from '../services/transformation.service.js';

/**
 * Custom Error class for Transformation failures
 */
export class TransformationError extends Error {
  constructor(message, field, record) {
    super(message);
    this.name = 'TransformationError';
    this.field = field;
    this.record = record;
  }
}

/**
 * Step 7 — Transformation Processor
 * Applies transformation rules to a single record object.
 * Process one record at a time. Do not accumulate dataset in memory.
 *
 * @param {object} record - Single data record
 * @param {Array<object>} rules - List of transformation rules [{ field, transformation, config, order }]
 * @returns {object} Transformed record
 */
export function applyRecordTransformations(record, rules) {
  if (!record || typeof record !== 'object' || record._isMalformed) {
    return record;
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    return record;
  }

  // Clone record to avoid direct mutation of input reference while preserving _ internal keys
  const output = { ...record };

  // Sort rules by order if present
  const sortedRules = [...rules].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const rule of sortedRules) {
    const field = rule.field || rule.destinationField || rule.targetField;
    if (!field || !(field in output)) {
      continue;
    }

    const type = normalizeTransformationType(rule.transformation || rule.transformationType || rule.type);
    let val = output[field];

    try {
      switch (type) {
        case 'uppercase':
          if (typeof val === 'string') {
            output[field] = val.toUpperCase();
          } else if (val !== null && val !== undefined) {
            output[field] = String(val).toUpperCase();
          }
          break;

        case 'lowercase':
          if (typeof val === 'string') {
            output[field] = val.toLowerCase();
          } else if (val !== null && val !== undefined) {
            output[field] = String(val).toLowerCase();
          }
          break;

        case 'trim':
          if (typeof val === 'string') {
            output[field] = val.trim();
          }
          break;

        case 'number':
          if (val === null || val === undefined || val === '') {
            output[field] = null;
          } else if (typeof val === 'number') {
            if (!Number.isFinite(val)) {
              throw new TransformationError(`Invalid numeric value '${val}' for field '${field}'`, field, record);
            }
          } else {
            const strVal = String(val).trim();
            const num = Number(strVal);
            if (Number.isNaN(num) || strVal === '') {
              throw new TransformationError(`Cannot convert non-numeric value '${val}' to number for field '${field}'`, field, record);
            }
            output[field] = num;
          }
          break;

        case 'remove_empty':
          if (
            val === null ||
            val === undefined ||
            val === '' ||
            (typeof val === 'string' && val.trim() === '')
          ) {
            delete output[field];
          }
          break;

        default:
          break;
      }
    } catch (err) {
      if (err instanceof TransformationError) {
        throw err;
      }
      throw new TransformationError(`Transformation '${type}' failed on field '${field}': ${err.message}`, field, record);
    }
  }

  return output;
}

/**
 * Step 8, 9 & 10 — Streaming Transformation Transform Stream
 * Responsibilities:
 * - Operates in objectMode: true
 * - Processes records item-by-item incrementally
 * - Preserves backpressure and flat memory profile
 * - Step 10 Error Handling: Bad record marked _isMalformed and stream continues
 *
 * @param {object} transformationConfig - { transformations: [{ field, transformation, config, order }] }
 * @returns {Transform}
 */
export function createTransformationTransform(transformationConfig) {
  const rules = (transformationConfig && Array.isArray(transformationConfig.transformations))
    ? transformationConfig.transformations
    : [];

  return new Transform({
    objectMode: true,
    transform(record, encoding, callback) {
      // Pass malformed or non-object records downstream directly
      if (!record || typeof record !== 'object') {
        return callback(null, record);
      }

      if (record._isMalformed) {
        return callback(null, record);
      }

      try {
        const transformedRecord = applyRecordTransformations(record, rules);
        if (transformedRecord && typeof transformedRecord === 'object' && !transformedRecord._isMalformed) {
          transformedRecord._isTransformed = true;
        }
        callback(null, transformedRecord);
      } catch (err) {
        // Step 10: Transformation Error Handling — Catch record error without crashing pipeline
        const failedRecord = {
          _isMalformed: true,
          _rowNumber: record._rowNumber || null,
          field: err.field || null,
          error: {
            type: 'TRANSFORMATION_ERROR',
            message: err.message
          },
          raw: record
        };
        callback(null, failedRecord);
      }
    }
  });
}

export default {
  TransformationError,
  applyRecordTransformations,
  createTransformationTransform
};
