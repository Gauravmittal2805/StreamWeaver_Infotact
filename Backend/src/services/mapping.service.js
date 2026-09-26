import { getDatasetInfo } from './dataset.service.js';
import { getDatasetPreview } from './file.service.js';
import { transformRecord, applyTransformation, SUPPORTED_TRANSFORMATIONS } from '../utils/transformation.utils.js';

// In-memory mapping configurations store keyed by datasetId
const mappingsStore = new Map();

/**
 * Validates a mapping & transformation payload before saving or updating.
 * Enforces constraints:
 * - Dataset exists (if datasetId provided)
 * - Non-empty mappings array
 * - Source and Destination fields are non-empty strings
 * - Handles duplicate source or destination mappings
 * - Validates transformation types and configuration
 *
 * @param {object} payload - { datasetId, mappings, destinationFields, unmappedFieldsMode }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMapping(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Mapping payload must be a valid JSON object'] };
  }

  const { datasetId, mappings } = payload;

  if (!datasetId || typeof datasetId !== 'string' || !datasetId.trim()) {
    errors.push('Dataset ID is required');
  } else {
    const datasetInfo = getDatasetInfo(datasetId);
    if (!datasetInfo) {
      errors.push(`Dataset '${datasetId}' does not exist`);
    }
  }

  if (!Array.isArray(mappings) || mappings.length === 0) {
    errors.push('Mappings array cannot be empty. At least one valid field mapping is required');
    return { valid: false, errors };
  }

  const seenSourceFields = new Set();
  const seenDestinationFields = new Set();
  const validTransformTypes = new Set([
    'none', 'uppercase', 'lowercase', 'trim', 'number',
    'convert_to_number', 'convert_number', 'replace',
    'prefix', 'suffix', 'default_value', 'default'
  ]);

  mappings.forEach((rule, index) => {
    const ruleNum = index + 1;

    if (!rule || typeof rule !== 'object') {
      errors.push(`Mapping rule #${ruleNum} is invalid`);
      return;
    }

    const sourceField = rule.sourceField ? String(rule.sourceField).trim() : '';
    const destinationField = rule.destinationField ? String(rule.destinationField).trim() : '';

    if (!sourceField) {
      errors.push(`Mapping rule #${ruleNum}: Source field cannot be empty`);
    }

    if (!destinationField) {
      errors.push(`Mapping rule #${ruleNum}: Destination field cannot be empty`);
    }

    if (sourceField) {
      if (seenSourceFields.has(sourceField)) {
        errors.push(`Duplicate source field mapping found for '${sourceField}'`);
      }
      seenSourceFields.add(sourceField);
    }

    if (destinationField) {
      if (seenDestinationFields.has(destinationField)) {
        errors.push(`Duplicate destination field mapping found for '${destinationField}'`);
      }
      seenDestinationFields.add(destinationField);
    }

    const transformType = (rule.transformation || rule.transformRule || 'none').toLowerCase().replace(/\s+/g, '_');
    if (transformType && !validTransformTypes.has(transformType)) {
      errors.push(`Mapping rule #${ruleNum}: Unsupported transformation type '${rule.transformation}'`);
    }

    if (transformType === 'replace') {
      const config = rule.transformConfig || rule.config || {};
      if (config.find === undefined || config.find === null) {
        errors.push(`Mapping rule #${ruleNum} (Replace): 'find' pattern is required`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitizes mapping rules with normalized transformation attributes.
 * @param {Array} mappings 
 * @returns {Array}
 */
export function sanitizeMappings(mappings = []) {
  return mappings.map((rule, idx) => {
    const transformation = rule.transformation || rule.transformRule || 'none';
    const config = rule.transformConfig || rule.config || {};

    return {
      id: rule.id || `rule_${idx + 1}`,
      sourceField: String(rule.sourceField || '').trim(),
      destinationField: String(rule.destinationField || '').trim(),
      transformation: String(transformation).trim(),
      transformRule: String(transformation).trim(), // backwards compatibility
      transformConfig: { ...config }
    };
  });
}

/**
 * Saves a new mapping configuration associated with a dataset.
 *
 * @param {object} payload - { datasetId, mappings, destinationFields, unmappedFieldsMode, name }
 * @returns {object} Created mapping configuration
 */
export function saveMapping(payload) {
  const validation = validateMapping(payload);
  if (!validation.valid) {
    const error = new Error(`Invalid mapping configuration: ${validation.errors.join('; ')}`);
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const { datasetId, mappings, destinationFields = [], unmappedFieldsMode = 'ignore', name } = payload;
  const now = new Date().toISOString();

  const sanitizedMappings = sanitizeMappings(mappings);
  const sanitizedDestinations = destinationFields.length > 0
    ? destinationFields.map(f => String(f).trim()).filter(Boolean)
    : Array.from(new Set(sanitizedMappings.map(m => m.destinationField)));

  const mappingConfig = {
    id: `map_${datasetId}`,
    datasetId,
    name: name || `Mapping for ${datasetId}`,
    mappings: sanitizedMappings,
    destinationFields: sanitizedDestinations,
    unmappedFieldsMode,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  mappingsStore.set(datasetId, mappingConfig);
  return mappingConfig;
}

/**
 * Retrieves mapping configuration by dataset ID.
 *
 * @param {string} datasetId
 * @returns {object|null} Mapping configuration
 */
export function getMapping(datasetId) {
  if (!datasetId) return null;
  return mappingsStore.get(datasetId) || null;
}

/**
 * Updates an existing mapping configuration.
 *
 * @param {string} datasetId
 * @param {object} payload
 * @returns {object} Updated mapping configuration
 */
export function updateMapping(datasetId, payload) {
  const existing = getMapping(datasetId);

  const fullPayload = {
    datasetId,
    mappings: payload.mappings || (existing ? existing.mappings : []),
    destinationFields: payload.destinationFields || (existing ? existing.destinationFields : []),
    unmappedFieldsMode: payload.unmappedFieldsMode || (existing ? existing.unmappedFieldsMode : 'ignore'),
    name: payload.name || (existing ? existing.name : undefined)
  };

  const validation = validateMapping(fullPayload);
  if (!validation.valid) {
    const error = new Error(`Invalid mapping update: ${validation.errors.join('; ')}`);
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const now = new Date().toISOString();
  const sanitizedMappings = sanitizeMappings(fullPayload.mappings);
  const sanitizedDestinations = fullPayload.destinationFields.length > 0
    ? fullPayload.destinationFields.map(f => String(f).trim()).filter(Boolean)
    : Array.from(new Set(sanitizedMappings.map(m => m.destinationField)));

  const updatedConfig = {
    id: existing ? existing.id : `map_${datasetId}`,
    datasetId,
    name: fullPayload.name || `Mapping for ${datasetId}`,
    mappings: sanitizedMappings,
    destinationFields: sanitizedDestinations,
    unmappedFieldsMode: fullPayload.unmappedFieldsMode,
    status: 'active',
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  mappingsStore.set(datasetId, updatedConfig);
  return updatedConfig;
}

/**
 * Deletes a mapping configuration.
 *
 * @param {string} datasetId
 * @returns {boolean} Success status
 */
export function deleteMapping(datasetId) {
  if (!datasetId) return false;
  return mappingsStore.delete(datasetId);
}

/**
 * Connects Dataset Metadata, Preview, and Mapping Configuration.
 *
 * @param {string} datasetId
 * @returns {object|null} Complete dataset architecture representation
 */
export function getDatasetWithMapping(datasetId) {
  const datasetInfo = getDatasetInfo(datasetId);
  if (!datasetInfo) return null;

  const mappingConfig = getMapping(datasetId);

  return {
    dataset: datasetInfo,
    metadata: {
      id: datasetInfo.id,
      filename: datasetInfo.filename || datasetInfo.originalName,
      format: datasetInfo.format,
      size: datasetInfo.size,
      status: datasetInfo.status,
      uploadedAt: datasetInfo.uploadedAt
    },
    mapping: mappingConfig
  };
}

/**
 * Previews mapping and transformation results on sample records.
 * Does NOT process the whole dataset — only the specified sample rows (default up to 10 rows).
 *
 * @param {string} datasetId
 * @param {object} options - { mappings, sampleRows, limit, unmappedFieldsMode }
 * @returns {Promise<object>} Preview results with before and after comparisons
 */
export async function previewMappingTransformation(datasetId, options = {}) {
  let sampleRows = options.sampleRows;
  const limit = options.limit || 10;
  const mappings = sanitizeMappings(options.mappings || (getMapping(datasetId)?.mappings || []));
  const unmappedFieldsMode = options.unmappedFieldsMode || 'ignore';

  if (!sampleRows || sampleRows.length === 0) {
    if (datasetId) {
      try {
        const preview = await getDatasetPreview(datasetId, limit);
        sampleRows = preview?.rows || [];
      } catch (err) {
        sampleRows = [];
      }
    } else {
      sampleRows = [];
    }
  }

  const rowsToPreview = sampleRows.slice(0, limit);

  // Generate before/after itemized comparison for each mapped field
  const comparisons = rowsToPreview.map((row, rowIndex) => {
    const fieldComparisons = mappings.map(rule => {
      const sourceVal = row[rule.sourceField];
      const transformType = rule.transformation || rule.transformRule || 'none';
      const config = rule.transformConfig || rule.config || {};
      const targetVal = applyTransformation(sourceVal, transformType, config);

      return {
        sourceField: rule.sourceField,
        destinationField: rule.destinationField,
        transformation: transformType,
        before: sourceVal !== undefined ? sourceVal : null,
        after: targetVal !== undefined ? targetVal : null
      };
    });

    const transformedRow = transformRecord(row, mappings, unmappedFieldsMode);

    return {
      rowIndex,
      raw: row,
      transformed: transformedRow,
      fields: fieldComparisons
    };
  });

  return {
    datasetId,
    previewRowCount: comparisons.length,
    mappings,
    transformedRows: comparisons.map(c => c.transformed),
    comparisons,
    supportedTransformations: SUPPORTED_TRANSFORMATIONS
  };
}

export default {
  validateMapping,
  sanitizeMappings,
  saveMapping,
  getMapping,
  updateMapping,
  deleteMapping,
  getDatasetWithMapping,
  previewMappingTransformation
};
