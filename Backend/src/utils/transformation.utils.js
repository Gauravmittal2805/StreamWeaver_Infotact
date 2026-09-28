import vm from 'node:vm';

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
 * - custom_js: Run custom JavaScript expression/function in secure server-side sandbox
 */

export const SUPPORTED_TRANSFORMATIONS = [
  { id: 'none', label: 'None (Direct)', description: 'Pass value through unchanged', hasConfig: false },
  { id: 'uppercase', label: 'Uppercase', description: 'Convert text to UPPERCASE', hasConfig: false },
  { id: 'lowercase', label: 'Lowercase', description: 'Convert text to lowercase', hasConfig: false },
  { id: 'trim', label: 'Trim', description: 'Remove leading and trailing whitespace', hasConfig: false },
  { id: 'number', label: 'Convert to Number', description: 'Parse string into numeric value', hasConfig: false },
  { id: 'custom_js', label: 'Custom JavaScript', description: 'Custom rule executed in secure server-side sandbox', hasConfig: true },
  { id: 'replace', label: 'Replace', description: 'Find and replace substring', hasConfig: true },
  { id: 'prefix', label: 'Add Prefix', description: 'Prepend text before the value', hasConfig: true },
  { id: 'suffix', label: 'Add Suffix', description: 'Append text after the value', hasConfig: true },
  { id: 'default_value', label: 'Default Value', description: 'Fallback when value is empty or null', hasConfig: true },
];

/**
 * Execute custom JavaScript rule in a secure, isolated server-side VM sandbox.
 * 
 * @param {string} code - JavaScript code written by the user (e.g. `return value.toUpperCase();`)
 * @param {any} value - The input value to transform
 * @param {object} [record={}] - The entire row record context
 * @param {number} [timeoutMs=1000] - Sandbox execution timeout in milliseconds
 * @returns {{ success: boolean, result?: any, errorType?: string, errorMessage?: string, rawError?: string }}
 */
export function executeCustomJavaScript(code, value, record = {}, timeoutMs = 1000) {
  if (code === undefined || code === null || typeof code !== 'string' || !code.trim()) {
    return { success: true, result: value };
  }

  const trimmedCode = code.trim();

  // If user supplied code without 'return' and it's a single expression (e.g. `value.toUpperCase()`), add return
  let executableBody = trimmedCode;
  if (!trimmedCode.includes('return') && !trimmedCode.includes(';') && !trimmedCode.startsWith('{')) {
    executableBody = `return (${trimmedCode});`;
  }

  const wrappedScript = `
    "use strict";
    (function(value, record) {
      ${executableBody}
    })(value, record)
  `;

  try {
    const sandbox = Object.freeze({
      value,
      record: Object.freeze({ ...record }),
      Math,
      Number,
      String,
      Boolean,
      Date,
      Array,
      Object: {
        keys: Object.keys,
        values: Object.values,
        entries: Object.entries,
        assign: Object.assign
      },
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      JSON: {
        parse: JSON.parse,
        stringify: JSON.stringify
      }
    });

    const script = new vm.Script(wrappedScript, {
      filename: 'custom-transform.js',
      lineOffset: 0,
      displayErrors: true
    });

    const context = vm.createContext(sandbox);
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
      breakOnSigint: true
    });

    return {
      success: true,
      result: result === undefined ? null : result
    };
  } catch (err) {
    let errorType = 'execution_error';
    let errorMessage = 'The transformation could not be executed.';

    if (err.name === 'SyntaxError' || err.message?.includes('Unexpected') || err.message?.includes('Syntax')) {
      errorType = 'syntax_error';
      errorMessage = 'Invalid JavaScript rule syntax.';
    } else if (err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' || err.message?.includes('timed out')) {
      errorType = 'timeout_error';
      errorMessage = 'The transformation took too long to execute (timeout).';
    } else if (err instanceof TypeError || err instanceof ReferenceError || err instanceof RangeError) {
      errorType = 'runtime_error';
      errorMessage = `Runtime error: ${err.message}`;
    }

    return {
      success: false,
      errorType,
      errorMessage,
      rawError: err.message
    };
  }
}

/**
 * Apply transformation rule to a single scalar value.
 *
 * @param {any} value - Source value
 * @param {string} transformation - Transformation type ID
 * @param {object} [config] - Transformation configuration options
 * @param {object} [record] - Optional full record for custom context
 * @returns {any} Transformed value
 */
export function applyTransformation(value, transformation = 'none', config = {}, record = {}) {
  const normTransform = (transformation || 'none').toLowerCase().replace(/\s+/g, '_');

  if (value === undefined || value === null) {
    if ((normTransform === 'default_value' || normTransform === 'default') && config?.defaultValue !== undefined) {
      return config.defaultValue;
    }
    if (normTransform === 'custom_js' || normTransform === 'custom_javascript' || normTransform === 'custom' || normTransform === 'javascript') {
      const code = config?.code || config?.customCode || config?.script || '';
      if (code) {
        const execRes = executeCustomJavaScript(code, value, record);
        return execRes.success ? execRes.result : null;
      }
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

    case 'custom_js':
    case 'custom_javascript':
    case 'custom':
    case 'javascript':
    case 'custom_code': {
      const code = config?.code || config?.customCode || config?.script || '';
      if (!code) return value;
      const execRes = executeCustomJavaScript(code, value, record);
      if (!execRes.success) {
        return null;
      }
      return execRes.result;
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
    const transformedValue = applyTransformation(rawValue, transformType, config, record);

    transformed[destinationField] = transformedValue;
  }

  return transformed;
}

export default {
  SUPPORTED_TRANSFORMATIONS,
  executeCustomJavaScript,
  applyTransformation,
  transformRecord
};
