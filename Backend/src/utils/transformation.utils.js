/**
 * Transformation utility functions for StreamWeaver ETL.
 * Supported transformations:
 * - none: No transformation
 * - uppercase: Convert string to UPPERCASE
 * - lowercase: Convert string to lowercase
 * - trim: Remove leading and trailing whitespace
 * - number: Convert value to numeric type (float/int)
 * - replace: Replace target substring with a replacement string
 * - prefix: Prepend a prefix string
 * - suffix: Append a suffix string
 * - default_value: Provide fallback value if source is empty/null
 */

export const SUPPORTED_TRANSFORMATIONS = [
  { id: 'none', label: 'None (Direct)', description: 'Pass value through unchanged', hasConfig: false },
  { id: 'uppercase', label: 'Uppercase', description: 'Convert text to UPPERCASE', hasConfig: false },
  { id: 'lowercase', label: 'Lowercase', description: 'Convert text to lowercase', hasConfig: false },
  { id: 'trim', label: 'Trim', description: 'Remove leading and trailing whitespace', hasConfig: false },
  { id: 'number', label: 'Convert to Number', description: 'Parse string into numeric value', hasConfig: false },
  { id: 'replace', label: 'Replace', description: 'Find and replace substring', hasConfig: true },
  { id: 'prefix', label: 'Add Prefix', description: 'Prepend text before the value', hasConfig: true },
  { id: 'suffix', label: 'Add Suffix', description: 'Append text after the value', hasConfig: true },
  { id: 'default_value', label: 'Default Value', description: 'Fallback when value is empty or null', hasConfig: true },
];

/**
 * Apply transformation rule to a single scalar value.
 *
 * @param {any} value - Source value
 * @param {string} transformation - Transformation type ID
 * @param {object} [config] - Transformation configuration options
 * @returns {any} Transformed value
 */
export function applyTransformation(value, transformation = 'none', config = {}) {
  const normTransform = (transformation || 'none').toLowerCase().replace(/\s+/g, '_');

  if (value === undefined || value === null) {
    if ((normTransform === 'default_value' || normTransform === 'default') && config?.defaultValue !== undefined) {
      return config.defaultValue;
    }
    return null;
  }

  const strVal = String(value);

  switch (normTransform) {
    case 'uppercase':
      return strVal.toUpperCase();

    case 'lowercase':
      return strVal.toLowerCase();

    case 'trim':
      return strVal.trim();

    case 'number':
    case 'convert_to_number':
    case 'convert_number': {
      const trimmed = strVal.trim();
      if (trimmed === '') return null;
      const num = Number(trimmed);
      return Number.isNaN(num) ? null : num;
    }

    case 'replace': {
      const find = config?.find !== undefined ? String(config.find) : '';
      const replaceWith = config?.replaceWith !== undefined ? String(config.replaceWith) : '';
      if (!find) return strVal;
      return strVal.split(find).join(replaceWith);
    }

    case 'prefix': {
      const prefix = config?.prefix !== undefined ? String(config.prefix) : '';
      return `${prefix}${strVal}`;
    }

    case 'suffix': {
      const suffix = config?.suffix !== undefined ? String(config.suffix) : '';
      return `${strVal}${suffix}`;
    }

    case 'default_value':
    case 'default': {
      if (strVal.trim() === '') {
        return config?.defaultValue !== undefined ? config.defaultValue : '';
      }
      return strVal;
    }

    case 'none':
    default:
      return value;
  }
}

/**
 * Transform a single record object according to mapping and transformation rules.
 *
 * @param {object} record - Source record
 * @param {Array} mappings - Mappings array
 * @param {string} [unmappedFieldsMode='ignore']
 * @returns {object} Transformed record
 */
export function transformRecord(record, mappings = [], unmappedFieldsMode = 'ignore') {
  if (!record || typeof record !== 'object') return record;

  const transformed = {};

  // Preserve internal metadata fields starting with '_'
  for (const key of Object.keys(record)) {
    if (key.startsWith('_')) {
      transformed[key] = record[key];
    }
  }

  // Copy unmapped fields if requested
  if (unmappedFieldsMode === 'keep') {
    for (const [k, v] of Object.entries(record)) {
      if (!k.startsWith('_')) {
        transformed[k] = v;
      }
    }
  }

  // Apply mapped transformations
  for (const rule of mappings) {
    const { sourceField, destinationField } = rule;
    if (!sourceField || !destinationField) continue;

    const transformType = rule.transformation || rule.transformRule || 'none';
    const config = rule.transformConfig || rule.config || {};

    const rawValue = record[sourceField];
    const transformedValue = applyTransformation(rawValue, transformType, config);

    transformed[destinationField] = transformedValue;
  }

  return transformed;
}

export default {
  SUPPORTED_TRANSFORMATIONS,
  applyTransformation,
  transformRecord
};
