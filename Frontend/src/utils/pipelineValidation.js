/**
 * Pipeline Validation Engine for StreamWeaver ETL
 * Validates dataset selection, mappings, destination fields, transformations,
 * and custom JavaScript rules before processing is permitted.
 */

export function validatePipelineBeforeProcessing({
  datasetMeta,
  mappings = [],
  destinationFields = []
}) {
  const errors = [];
  const warnings = [];

  // 1. Check Dataset selected
  const datasetId = datasetMeta?.datasetId || datasetMeta?.id || datasetMeta?._id;
  if (!datasetId) {
    errors.push('Please select a valid dataset before starting ETL processing.');
  }

  // 2. Check Mapping completed
  if (!mappings || mappings.length === 0) {
    errors.push('Please complete at least one field mapping before processing.');
  }

  // 3. Check Destination fields valid
  const destFieldNames = new Set();
  const duplicateDestFields = new Set();

  destinationFields.forEach((field) => {
    const name = typeof field === 'string' ? field : field?.name;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      errors.push('One or more destination fields are empty. Please specify valid field names.');
      return;
    }

    const trimmed = name.trim();
    // Identifier character check (letters, digits, underscores, hyphens)
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(trimmed)) {
      errors.push(`Destination field "${trimmed}" contains invalid characters. Use letters, numbers, underscores, or hyphens.`);
    }

    if (destFieldNames.has(trimmed.toLowerCase())) {
      duplicateDestFields.add(trimmed);
    } else {
      destFieldNames.add(trimmed.toLowerCase());
    }
  });

  if (duplicateDestFields.size > 0) {
    errors.push(`Duplicate destination field names detected: ${Array.from(duplicateDestFields).join(', ')}. Each destination field must be unique.`);
  }

  // 4. Check Required fields mapped
  const mappedDestinations = new Set(
    mappings.map(m => (m.destinationField || '').trim().toLowerCase()).filter(Boolean)
  );

  const missingRequired = [];
  destinationFields.forEach((field) => {
    if (typeof field === 'object' && field !== null && field.required) {
      const fieldName = (field.name || '').trim();
      if (fieldName && !mappedDestinations.has(fieldName.toLowerCase())) {
        missingRequired.push(fieldName);
      }
    }
  });

  if (missingRequired.length > 0) {
    errors.push(`Please map all required destination fields before processing: ${missingRequired.join(', ')}.`);
  }

  // 5. Check Transformation configuration & Custom JavaScript
  mappings.forEach((m) => {
    const fieldLabel = m.sourceField || m.destinationField || 'Mapped Field';
    const transformType = (m.transformation || m.type || '').toLowerCase();
    const config = m.transformationConfig || m.config || {};

    if (transformType && transformType !== 'none') {
      // Validate Custom JavaScript
      if (transformType === 'custom' || transformType === 'custom_js' || transformType === 'javascript') {
        const code = config.code || config.script || m.customCode || '';
        if (!code || code.trim() === '') {
          errors.push(`Custom JavaScript transformation for "${fieldLabel}" is empty. Please provide a script or remove the transformation.`);
        } else {
          try {
            // Safe syntax test without execution
            new Function('value', 'record', 'row', code);
          } catch (syntaxErr) {
            const cleanErr = syntaxErr.message ? syntaxErr.message.replace(/^.*:\s*/, '') : 'Syntax error';
            errors.push(`Custom JavaScript for "${fieldLabel}" has syntax errors: ${cleanErr}.`);
          }
        }
      }

      // Validate Regex replacement
      if (transformType === 'regex' || transformType === 'regex_replace') {
        const pattern = config.pattern || config.regex;
        if (!pattern) {
          errors.push(`Regular expression pattern is required for "${fieldLabel}".`);
        } else {
          try {
            new RegExp(pattern, config.flags || '');
          } catch (regexErr) {
            errors.push(`Invalid regular expression for "${fieldLabel}": ${regexErr.message}.`);
          }
        }
      }

      // Validate Delimiter for split
      if (transformType === 'split' && !config.delimiter) {
        errors.push(`Split transformation for "${fieldLabel}" requires a delimiter.`);
      }

      // Validate Type Casting
      if (transformType === 'cast' || transformType === 'type_cast') {
        if (!config.targetType) {
          errors.push(`Type cast transformation for "${fieldLabel}" requires a target type.`);
        }
      }
    }
  });

  // Warnings (non-blocking guidelines)
  if (mappings.length > 0 && destinationFields.length > mappings.length) {
    warnings.push(`${destinationFields.length - mappings.length} destination fields will receive null or default values.`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      datasetReady: Boolean(datasetId),
      mappingCount: mappings.length,
      destinationCount: destinationFields.length,
      hasTransformations: mappings.some(m => m.transformation && m.transformation !== 'none')
    }
  };
}

export default validatePipelineBeforeProcessing;
