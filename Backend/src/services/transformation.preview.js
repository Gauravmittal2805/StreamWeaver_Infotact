import { Writable } from 'stream';
import { pipeline } from 'stream/promises';
import { getReadStream } from './file.service.js';
import { createParserStream } from '../parsers/parser.factory.js';
import { getMapping } from './mapping.service.js';
import { createMappingTransform } from '../streams/mapping.transform.js';
import { getTransformation } from './transformation.service.js';
import { applyRecordTransformations } from '../streams/transformation.transform.js';

/**
 * Step 12 — Transformation Preview Support
 * Processes up to `limit` (default 100) records from a dataset or provided sample records,
 * returning Before -> Mapped -> Transformed previews for UI consumption.
 *
 * @param {object} options
 * @param {string} [options.datasetId] - Dataset ID to stream sample from
 * @param {Array<object>} [options.rawRecords] - Optional inline sample records to preview
 * @param {object} [options.mappingConfig] - Optional override mapping config
 * @param {object} [options.transformationConfig] - Optional override transformation config
 * @param {number} [options.limit=100] - Maximum records to preview
 * @returns {Promise<{ success: boolean, count: number, limit: number, preview: Array<{ original: object, mapped: object, transformed: object, isMalformed?: boolean, error?: object }> }>}
 */
export async function previewTransformations(options = {}) {
  const limit = Math.min(Math.max(parseInt(options.limit || 100, 10), 1), 500);
  const { datasetId, rawRecords, mappingConfig: customMapping, transformationConfig: customTransformation } = options;

  // Resolve mapping rules
  const mappingConfig = customMapping || (datasetId ? getMapping(datasetId) : null);
  
  // Resolve transformation rules
  const transformationConfig = customTransformation || (datasetId ? getTransformation(datasetId) : null);
  const rules = (transformationConfig && Array.isArray(transformationConfig.transformations))
    ? transformationConfig.transformations
    : [];

  // Helper to map & transform a single record object
  function processPreviewRecord(rawRecord) {
    if (!rawRecord || typeof rawRecord !== 'object') {
      return {
        original: rawRecord,
        mapped: rawRecord,
        transformed: rawRecord
      };
    }

    let mappedRecord = { ...rawRecord };

    // Apply mapping if mappingConfig is present
    if (mappingConfig && Array.isArray(mappingConfig.mappings) && mappingConfig.mappings.length > 0) {
      const unmappedFieldsMode = mappingConfig.unmappedFieldsMode || 'ignore';
      const mappedTemp = {};

      // Preserve metadata starting with '_'
      for (const key of Object.keys(rawRecord)) {
        if (key.startsWith('_')) {
          mappedTemp[key] = rawRecord[key];
        }
      }

      if (unmappedFieldsMode === 'keep') {
        for (const [k, v] of Object.entries(rawRecord)) {
          if (!k.startsWith('_')) {
            mappedTemp[k] = v;
          }
        }
      }

      for (const rule of mappingConfig.mappings) {
        const { sourceField, destinationField } = rule;
        if (sourceField && destinationField) {
          let val = rawRecord[sourceField];
          if (val === undefined || val === null) {
            val = null;
          } else if (typeof val === 'string') {
            const trimmed = val.trim();
            val = trimmed === '' ? null : trimmed;
          }
          mappedTemp[destinationField] = val;
        }
      }

      mappedRecord = mappedTemp;
    }

    // Apply transformation
    try {
      const transformedRecord = applyRecordTransformations(mappedRecord, rules);
      return {
        original: rawRecord,
        mapped: mappedRecord,
        transformed: transformedRecord
      };
    } catch (err) {
      return {
        original: rawRecord,
        mapped: mappedRecord,
        transformed: mappedRecord,
        isMalformed: true,
        error: {
          type: 'TRANSFORMATION_ERROR',
          message: err.message,
          field: err.field || null
        }
      };
    }
  }

  // 1. If inline raw records were provided, process immediately
  if (Array.isArray(rawRecords)) {
    const sample = rawRecords.slice(0, limit);
    const preview = sample.map(processPreviewRecord);
    return {
      success: true,
      count: preview.length,
      limit,
      preview
    };
  }

  // 2. Stream from dataset if datasetId provided
  if (!datasetId) {
    throw new Error('Either datasetId or rawRecords array is required for transformation preview');
  }

  const readResult = await getReadStream(datasetId);
  if (!readResult || !readResult.success) {
    throw new Error((readResult && readResult.error) || `Dataset '${datasetId}' read stream not available`);
  }

  const { stream: fileReadStream, metadata } = readResult;
  const format = (metadata && metadata.format) ? metadata.format.toLowerCase() : 'csv';
  const parserStream = createParserStream(format);

  const previewResults = [];
  let recordCount = 0;

  // Custom writable stream that collects up to `limit` records and aborts stream gracefully
  const previewCollector = new Writable({
    objectMode: true,
    write(record, encoding, callback) {
      if (recordCount < limit) {
        recordCount++;
        const processed = processPreviewRecord(record);
        previewResults.push(processed);

        if (recordCount >= limit) {
          // Destroy read stream to preserve memory & stop further parsing
          fileReadStream.destroy();
        }
      }
      callback();
    }
  });

  try {
    await pipeline(fileReadStream, parserStream, previewCollector);
  } catch (err) {
    // Abort errors from stream destroy are expected when hitting limit
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE' && !fileReadStream.destroyed) {
      console.warn('[Transformation Preview] Stream completed or ended early:', err.message);
    }
  }

  return {
    success: true,
    count: previewResults.length,
    limit,
    preview: previewResults
  };
}

export default {
  previewTransformations
};
