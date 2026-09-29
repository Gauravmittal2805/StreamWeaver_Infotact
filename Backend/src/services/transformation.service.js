import { getDatasetInfo } from './dataset.service.js';

// In-memory store for dataset transformation configurations keyed by datasetId
const transformationsStore = new Map();

/**
 * List of predefined supported transformations (Step 4)
 */
export const SUPPORTED_TRANSFORMATIONS = {
  // Text transformations
  uppercase: {
    type: 'uppercase',
    name: 'Uppercase',
    category: 'text',
    description: 'Converts text values to uppercase (e.g. gaurav -> GAURAV)'
  },
  lowercase: {
    type: 'lowercase',
    name: 'Lowercase',
    category: 'text',
    description: 'Converts text values to lowercase (e.g. GAURAV@EXAMPLE.COM -> gaurav@example.com)'
  },
  trim: {
    type: 'trim',
    name: 'Trim Whitespace',
    category: 'text',
    description: 'Trims leading and trailing whitespace (e.g. " Gaurav " -> "Gaurav")'
  },
  trim_whitespace: {
    type: 'trim_whitespace',
    name: 'Trim Whitespace',
    category: 'text',
    description: 'Trims leading and trailing whitespace'
  },

  // Numeric transformations
  number: {
    type: 'number',
    name: 'Convert to Number',
    category: 'numeric',
    description: 'Converts numeric string to number (e.g. "25000" -> 25000)'
  },
  convert_to_number: {
    type: 'convert_to_number',
    name: 'Convert to Number',
    category: 'numeric',
    description: 'Converts numeric string to number'
  },
  numeric: {
    type: 'numeric',
    name: 'Numeric Conversion',
    category: 'numeric',
    description: 'Converts numeric string to number'
  },

  // General transformations
  remove_empty: {
    type: 'remove_empty',
    name: 'Remove Empty Values',
    category: 'general',
    description: 'Removes empty strings, null, or undefined values'
  },
  remove_empty_values: {
    type: 'remove_empty_values',
    name: 'Remove Empty Values',
    category: 'general',
    description: 'Removes empty strings, null, or undefined values'
  }
};

/**
 * Normalizes transformation type alias to canonical name
 * @param {string} type 
 * @returns {string}
 */
export function normalizeTransformationType(type) {
  if (!type || typeof type !== 'string') return '';
  const lower = type.trim().toLowerCase();
  
  if (['uppercase', 'upper'].includes(lower)) return 'uppercase';
  if (['lowercase', 'lower'].includes(lower)) return 'lowercase';
  if (['trim', 'trim_whitespace', 'trimwhitespace'].includes(lower)) return 'trim';
  if (['number', 'convert_to_number', 'numeric', 'to_number'].includes(lower)) return 'number';
  if (['remove_empty', 'remove_empty_values', 'drop_empty'].includes(lower)) return 'remove_empty';
  
  return lower;
}

/**
 * Step 6 — Validate Transformation Configuration
 * Validates payload before saving or updating.
 * Enforces:
 * - Dataset exists.
 * - Field exists.
 * - Transformation type is supported.
 * - Required configuration exists.
 * - Duplicate/conflicting rules are handled.
 *
 * @param {object} payload - { datasetId, transformations }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateTransformation(payload) {
  const errors = [];

  if (!payload || typeof payload !== 'object') {
    return { valid: false, errors: ['Transformation payload must be a valid JSON object'] };
  }

  const { datasetId, transformations } = payload;

  // Validate datasetId presence & existence
  if (!datasetId || typeof datasetId !== 'string' || !datasetId.trim()) {
    errors.push('Dataset ID is required');
  } else {
    const datasetInfo = getDatasetInfo(datasetId);
    if (!datasetInfo) {
      errors.push(`Dataset '${datasetId}' does not exist`);
    }
  }

  // Validate transformations array
  if (!Array.isArray(transformations) || transformations.length === 0) {
    errors.push('Transformations array cannot be empty. At least one transformation rule is required');
    return { valid: false, errors };
  }

  const ruleSignatures = new Set();

  transformations.forEach((rule, index) => {
    const ruleNum = index + 1;

    if (!rule || typeof rule !== 'object') {
      errors.push(`Transformation rule #${ruleNum} is invalid`);
      return;
    }

    const field = rule.field || rule.destinationField || rule.targetField;
    const rawType = rule.transformation || rule.transformationType || rule.type;

    // Validate Field exists
    if (!field || typeof field !== 'string' || !field.trim()) {
      errors.push(`Transformation rule #${ruleNum}: Field being transformed is required`);
    }

    // Validate Transformation type is supported
    if (!rawType || typeof rawType !== 'string' || !rawType.trim()) {
      errors.push(`Transformation rule #${ruleNum}: Transformation type is required`);
    } else {
      const canonicalType = normalizeTransformationType(rawType);
      if (!SUPPORTED_TRANSFORMATIONS[canonicalType]) {
        errors.push(`Transformation rule #${ruleNum}: Transformation type '${rawType}' is not supported. Supported types: ${Object.keys(SUPPORTED_TRANSFORMATIONS).join(', ')}`);
      }
    }

    // Handle duplicate / conflicting rules for same field
    if (field && rawType) {
      const canonicalType = normalizeTransformationType(rawType);
      const signature = `${field.trim()}:${canonicalType}`;
      if (ruleSignatures.has(signature)) {
        errors.push(`Duplicate transformation rule '${canonicalType}' found for field '${field.trim()}'`);
      }
      ruleSignatures.add(signature);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Step 3 — Create Transformation Configuration
 * Saves transformation configuration associated with a dataset.
 *
 * @param {object} payload
 * @returns {object} Created transformation configuration
 */
export function saveTransformation(payload) {
  const validation = validateTransformation(payload);
  if (!validation.valid) {
    const error = new Error(`Invalid transformation configuration: ${validation.errors.join('; ')}`);
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const { datasetId, transformations, name } = payload;
  const now = new Date().toISOString();

  // Sanitize rules and assign order
  const sanitizedRules = transformations.map((rule, index) => {
    const field = String(rule.field || rule.destinationField || rule.targetField).trim();
    const rawType = String(rule.transformation || rule.transformationType || rule.type).trim();
    const canonicalType = normalizeTransformationType(rawType);

    return {
      field,
      transformation: canonicalType,
      originalType: rawType,
      config: rule.config && typeof rule.config === 'object' ? rule.config : {},
      order: typeof rule.order === 'number' ? rule.order : index + 1
    };
  });

  // Sort rules by order
  sanitizedRules.sort((a, b) => a.order - b.order);

  const config = {
    id: `trans_${datasetId}`,
    datasetId,
    name: name || `Transformations for ${datasetId}`,
    transformations: sanitizedRules,
    status: 'active',
    createdAt: now,
    updatedAt: now
  };

  transformationsStore.set(datasetId, config);
  return config;
}

/**
 * Retrieves transformation configuration by dataset ID
 *
 * @param {string} datasetId
 * @returns {object|null}
 */
export function getTransformation(datasetId) {
  if (!datasetId) return null;
  return transformationsStore.get(datasetId) || null;
}

/**
 * Updates transformation configuration
 *
 * @param {string} datasetId
 * @param {object} payload
 * @returns {object} Updated configuration
 */
export function updateTransformation(datasetId, payload) {
  const existing = getTransformation(datasetId);

  const fullPayload = {
    datasetId,
    transformations: payload.transformations || (existing ? existing.transformations : []),
    name: payload.name || (existing ? existing.name : undefined)
  };

  const validation = validateTransformation(fullPayload);
  if (!validation.valid) {
    const error = new Error(`Invalid transformation update: ${validation.errors.join('; ')}`);
    error.status = 400;
    error.details = validation.errors;
    throw error;
  }

  const now = new Date().toISOString();

  const sanitizedRules = fullPayload.transformations.map((rule, index) => {
    const field = String(rule.field || rule.destinationField || rule.targetField).trim();
    const rawType = String(rule.transformation || rule.transformationType || rule.type).trim();
    const canonicalType = normalizeTransformationType(rawType);

    return {
      field,
      transformation: canonicalType,
      originalType: rawType,
      config: rule.config && typeof rule.config === 'object' ? rule.config : {},
      order: typeof rule.order === 'number' ? rule.order : index + 1
    };
  });

  sanitizedRules.sort((a, b) => a.order - b.order);

  const updatedConfig = {
    id: existing ? existing.id : `trans_${datasetId}`,
    datasetId,
    name: fullPayload.name || `Transformations for ${datasetId}`,
    transformations: sanitizedRules,
    status: 'active',
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };

  transformationsStore.set(datasetId, updatedConfig);
  return updatedConfig;
}

/**
 * Deletes transformation configuration
 *
 * @param {string} datasetId
 * @returns {boolean}
 */
export function deleteTransformation(datasetId) {
  if (!datasetId) return false;
  return transformationsStore.delete(datasetId);
}

/**
 * Returns supported transformations metadata for UI / documentation
 */
export function getSupportedTransformationsList() {
  return Object.values(SUPPORTED_TRANSFORMATIONS);
}

export default {
  SUPPORTED_TRANSFORMATIONS,
  normalizeTransformationType,
  validateTransformation,
  saveTransformation,
  getTransformation,
  updateTransformation,
  deleteTransformation,
  getSupportedTransformationsList
};
