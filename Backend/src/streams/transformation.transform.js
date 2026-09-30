import { Transform } from 'stream';
import { applyTransformation } from '../utils/transformation.utils.js';
import { ERROR_CODES } from '../utils/errors.js';

export class TransformationError extends Error {
  constructor(message, field, record, code = ERROR_CODES.TRANSFORMATION_ERROR) {
    super(message);
    this.name = 'TransformationError';
    this.field = field;
    this.record = record;
    this.code = code;
  }
}

/**
 * Applies standalone transformation rules to a single record object.
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

  const output = { ...record };
  const sortedRules = [...rules].sort((a, b) => (a.order || 0) - (b.order || 0));

  for (const rule of sortedRules) {
    const field = rule.field || rule.destinationField || rule.targetField;
    if (!field || !(field in output)) {
      continue;
    }

    const type = rule.transformation || rule.transformationType || rule.type || 'none';
    const config = rule.config || rule.transformConfig || {};
    const val = output[field];

    try {
      const transformedVal = applyTransformation(val, type, config, record);
      if (transformedVal === undefined) {
        delete output[field];
      } else {
        output[field] = transformedVal;
      }
    } catch (err) {
      throw new TransformationError(
        `Transformation '${type}' failed on field '${field}': ${err.message}`,
        field,
        record,
        err.errorType || ERROR_CODES.TRANSFORMATION_ERROR
      );
    }
  }

  return output;
}

/**
 * Streaming Transformation Transform Stream
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
        const failedRecord = {
          _isMalformed: true,
          _rowNumber: record._rowNumber || null,
          field: err.field || null,
          error: {
            type: err.code || ERROR_CODES.TRANSFORMATION_ERROR,
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
