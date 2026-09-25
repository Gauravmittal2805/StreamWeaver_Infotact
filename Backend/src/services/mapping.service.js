import { getDatasetInfo } from './dataset.service.js';

// In-memory mapping configurations store keyed by datasetId
const mappingsStore = new Map();

/**
 * Validates a mapping payload before saving or updating.
 * Enforces constraints:
 * - Dataset exists
 * - Required mapping fields exist
 * - Non-empty mappings array
 * - Source and Destination fields are non-empty strings
 * - Handles duplicate source or destination mappings
 *
 * @param {object} payload - { datasetId, mappings, unmappedFieldsMode }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateMapping(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Mapping payload must be a valid JSON object'] };
  }

  const { datasetId, mappings } = payload;

  // Step 6: Validate datasetId presence & dataset existence
  if (!datasetId || typeof datasetId !== 'string' || !datasetId.trim()) {
    errors.push('Dataset ID is required');
  } else {
    const datasetInfo = getDatasetInfo(datasetId);
    if (!datasetInfo) {
      errors.push(`Dataset '${datasetId}' does not exist`);
    }
  }

  // Step 6: Validate empty mapping isn't accidentally accepted
  if (!Array.isArray(mappings) || mappings.length === 0) {
    errors.push('Mappings array cannot be empty. At least one valid field mapping is required');
    return { valid: false, errors };
  }

  const seenSourceFields = new Set();
  const seenDestinationFields = new Set();

  mappings.forEach((rule, index) => {
    const ruleNum = index + 1;

    if (!rule || typeof rule !== 'object') {
      errors.push(`Mapping rule #${ruleNum} is invalid`);
      return;
    }

    const sourceField = rule.sourceField ? String(rule.sourceField).trim() : '';
    const destinationField = rule.destinationField ? String(rule.destinationField).trim() : '';

    // Step 6: Validate Source field exists
    if (!sourceField) {
      errors.push(`Mapping rule #${ruleNum}: Source field cannot be empty`);
    }

    // Step 6: Validate Destination field exists
    if (!destinationField) {
      errors.push(`Mapping rule #${ruleNum}: Destination field cannot be empty`);
    }

    // Step 6: Handle duplicate mappings
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
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Saves a new mapping configuration associated with a dataset.
 *
 * @param {object} payload - { datasetId, mappings, unmappedFieldsMode, name }
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

  const { datasetId, mappings, unmappedFieldsMode = 'ignore', name } = payload;
  const now = new Date().toISOString();

  // Sanitize mappings
  const sanitizedMappings = mappings.map((rule) => ({
    sourceField: String(rule.sourceField).trim(),
    destinationField: String(rule.destinationField).trim(),
    transformRule: rule.transformRule ? String(rule.transformRule).trim() : null
  }));

  const mappingConfig = {
    id: `map_${datasetId}`,
    datasetId,
    name: name || `Mapping for ${datasetId}`,
    mappings: sanitizedMappings,
    unmappedFieldsMode, // Step 10: 'ignore' (only mapped fields) or 'keep'
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
  const sanitizedMappings = fullPayload.mappings.map((rule) => ({
    sourceField: String(rule.sourceField).trim(),
    destinationField: String(rule.destinationField).trim(),
    transformRule: rule.transformRule ? String(rule.transformRule).trim() : null
  }));

  const updatedConfig = {
    id: existing ? existing.id : `map_${datasetId}`,
    datasetId,
    name: fullPayload.name || `Mapping for ${datasetId}`,
    mappings: sanitizedMappings,
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
 * Connects Dataset Metadata, Preview, and Mapping Configuration (Step 7).
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

export default {
  validateMapping,
  saveMapping,
  getMapping,
  updateMapping,
  deleteMapping,
  getDatasetWithMapping
};
