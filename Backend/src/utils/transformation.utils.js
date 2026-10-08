import ivm from 'isolated-vm';
import { ERROR_CODES } from './errors.js';

/**
 * Transformation utility functions for StreamWeaver ETL.
 * Supported transformations:
 * - none: Direct pass-through
 * - uppercase: Convert string to UPPERCASE
 * - lowercase: Convert string to lowercase
 * - trim: Remove leading and trailing whitespace
 * - number: Convert value to numeric type (float/int)
 * - replace: Replace target substring with a replacement string
 * - prefix: Prepend a prefix string
 * - suffix: Append a suffix string
 * - default_value: Provide fallback value if source is empty/null
 * - remove_empty: Omit field if value is empty/null
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
  { id: 'remove_empty', label: 'Remove Empty', description: 'Remove field if empty or null', hasConfig: false }
];

/**
 * Extracts nested property value using dot-notation path (e.g. "user.profile.age")
 * Falls back to direct property lookup for flat objects.
 */
export function getNestedValue(obj, path) {
  if (!obj || typeof obj !== 'object' || path === null || path === undefined) return undefined;
  if (Object.prototype.hasOwnProperty.call(obj, path)) return obj[path];
  if (typeof path !== 'string' || !path.includes('.')) return obj[path];

  const parts = path.split('.');
  let curr = obj;
  for (const part of parts) {
    if (curr === null || curr === undefined || typeof curr !== 'object') return undefined;
    curr = curr[part];
  }
  return curr;
}

/**
 * Sets nested property value using dot-notation path (e.g. "user.profile.age")
 * Creates intermediate objects as needed.
 */
export function setNestedValue(obj, path, value) {
  if (!obj || typeof obj !== 'object' || !path) return obj;
  if (typeof path !== 'string' || !path.includes('.')) {
    obj[path] = value;
    return obj;
  }

  const parts = path.split('.');
  let curr = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!curr[part] || typeof curr[part] !== 'object') {
      curr[part] = {};
    }
    curr = curr[part];
  }
  curr[parts[parts.length - 1]] = value;
  return obj;
}

/**
 * Execute custom JavaScript rule in a secure, isolated server-side VM sandbox (isolated-vm).
 * Enforces:
 * - Isolated V8 heap with strict 128MB memory limit
 * - Strict CPU timeout
 * - Total isolation from Node.js runtime, filesystem, process, network, and prototype chain
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

  // Determine if code is a statement or multi-line block
  const hasStatementKeywords = /\b(return|var|let|const|if|else|for|while|do|switch|try|catch|throw|function)\b/.test(trimmedCode);
  const hasBlockSyntax = trimmedCode.includes(';') || trimmedCode.startsWith('{');

  let executableBody = trimmedCode;
  if (!hasStatementKeywords && !hasBlockSyntax) {
    executableBody = `return (${trimmedCode});`;
  }

  let isolate = null;
  try {
    // 128MB memory limit prevents runaway allocations
    isolate = new ivm.Isolate({ memoryLimit: 128 });
    const context = isolate.createContextSync();
    const jail = context.global;
    jail.setSync('global', jail.derefInto());

    const valueJson = JSON.stringify(value === undefined ? null : value);
    const recordJson = JSON.stringify(record || {});

    const wrappedScript = `
      (function() {
        "use strict";
        const value = ${valueJson};
        const record = ${recordJson};
        const fn = function(value, record) {
          ${executableBody}
        };
        const res = fn(value, record);
        return JSON.stringify(res === undefined ? null : res);
      })()
    `;

    const script = isolate.compileScriptSync(wrappedScript, { filename: 'custom-transform.js' });
    const outputJson = script.runSync(context, { timeout: timeoutMs });

    return {
      success: true,
      result: outputJson !== undefined ? JSON.parse(outputJson) : null
    };
  } catch (err) {
    let errorType = ERROR_CODES.TRANSFORMATION_ERROR;
    let errorMessage = err.message || 'The transformation could not be executed.';

    if (err.message && (err.message.includes('Script execution timed out') || err.message.includes('timed out'))) {
      errorType = ERROR_CODES.SANDBOX_TIMEOUT;
      errorMessage = `Sandbox execution timed out (${timeoutMs}ms limit exceeded).`;
    } else if (err.name === 'SyntaxError' || (err.message && err.message.includes('Unexpected token')) || (err.message && err.message.includes('SyntaxError'))) {
      errorType = ERROR_CODES.INVALID_TRANSFORMATION;
      errorMessage = `Syntax Error in custom JS: ${err.message}`;
    } else if (err instanceof TypeError || err instanceof ReferenceError || err instanceof RangeError) {
      errorType = ERROR_CODES.TRANSFORMATION_ERROR;
      errorMessage = `Runtime error: ${err.message}`;
    }

    return {
      success: false,
      errorType,
      errorMessage,
      rawError: err.message
    };
  } finally {
    if (isolate) {
      try {
        isolate.dispose();
      } catch {
        // Disposed cleanly
      }
    }
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
    if (normTransform === 'custom_js' || normTransform === 'custom_javascript' || normTransform === 'custom' || normTransform === 'javascript' || normTransform === 'custom_code') {
      const code = config?.code || config?.customCode || config?.script || '';
      if (code) {
        const execRes = executeCustomJavaScript(code, value, record);
        if (!execRes.success) {
          const err = new Error(execRes.errorMessage);
          err.errorType = execRes.errorType;
          throw err;
        }
        return execRes.result;
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
    case 'convert_number':
    case 'numeric': {
      const trimmed = strVal.trim();
      if (trimmed === '') return null;
      const num = Number(trimmed);
      if (Number.isNaN(num)) {
        const err = new Error(`Cannot convert '${strVal}' to number`);
        err.errorType = ERROR_CODES.TRANSFORMATION_ERROR;
        throw err;
      }
      return num;
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
        const err = new Error(execRes.errorMessage);
        err.errorType = execRes.errorType;
        throw err;
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

    case 'remove_empty':
    case 'remove_empty_values': {
      if (strVal.trim() === '') {
        return undefined;
      }
      return value;
    }

    case 'none':
    default:
      return value;
  }
}

/**
 * Transform a single record object according to mapping and transformation rules.
 * Supports nested source and destination properties (e.g. "user.profile.age").
 *
 * @param {object} record - Source record
 * @param {Array} mappings - Mappings array [{ sourceField, destinationField, transformation, transformConfig }]
 * @param {string} [unmappedFieldsMode='ignore']
 * @returns {object} Transformed record or malformed record indicator
 */
export function transformRecord(record, mappings = [], unmappedFieldsMode = 'ignore') {
  if (!record || typeof record !== 'object') return record;
  if (record._isMalformed) return record;

  try {
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

      const rawValue = getNestedValue(record, sourceField);
      let transformedValue;
      try {
        transformedValue = applyTransformation(rawValue, transformType, config, record);
      } catch (err) {
        return {
          _isMalformed: true,
          _rowNumber: record._rowNumber || null,
          field: sourceField || destinationField,
          error: {
            type: err.errorType || ERROR_CODES.TRANSFORMATION_ERROR,
            message: err.message
          },
          raw: record
        };
      }

      if (transformedValue !== undefined) {
        setNestedValue(transformed, destinationField, transformedValue);
      }
    }

    transformed._isMapped = true;
    transformed._isTransformed = true;
    return transformed;
  } catch (err) {
    return {
      _isMalformed: true,
      _rowNumber: record._rowNumber || null,
      field: null,
      error: {
        type: err.errorType || ERROR_CODES.TRANSFORMATION_ERROR,
        message: err.message
      },
      raw: record
    };
  }
}

export default {
  SUPPORTED_TRANSFORMATIONS,
  getNestedValue,
  setNestedValue,
  executeCustomJavaScript,
  applyTransformation,
  transformRecord
};
