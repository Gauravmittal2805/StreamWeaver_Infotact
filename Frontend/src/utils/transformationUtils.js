import { 
  Type, 
  ArrowUpAZ, 
  ArrowDownAZ, 
  Scissors, 
  Binary, 
  Replace, 
  Sparkles, 
  PlusCircle, 
  MinusCircle,
  HelpCircle
} from 'lucide-react';

/**
 * Transformation definitions for the UI builder
 */
export const TRANSFORMATIONS = [
  {
    id: 'none',
    label: 'None (Direct)',
    shortLabel: 'None',
    description: 'Pass field value through unchanged',
    icon: Type,
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    category: 'basic',
    hasConfig: false,
    example: { before: 'john doe', after: 'john doe' }
  },
  {
    id: 'uppercase',
    label: 'Uppercase',
    shortLabel: 'UPPER',
    description: 'Convert text to all UPPERCASE characters',
    icon: ArrowUpAZ,
    badgeColor: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    category: 'text',
    hasConfig: false,
    example: { before: 'gaurav', after: 'GAURAV' }
  },
  {
    id: 'lowercase',
    label: 'Lowercase',
    shortLabel: 'lower',
    description: 'Convert text to all lowercase characters',
    icon: ArrowDownAZ,
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    category: 'text',
    hasConfig: false,
    example: { before: 'GAURAV@X.COM', after: 'gaurav@x.com' }
  },
  {
    id: 'trim',
    label: 'Trim',
    shortLabel: 'Trim',
    description: 'Remove leading and trailing whitespaces',
    icon: Scissors,
    badgeColor: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    category: 'text',
    hasConfig: false,
    example: { before: '  Agra  ', after: 'Agra' }
  },
  {
    id: 'number',
    label: 'Convert to Number',
    shortLabel: 'Number',
    description: 'Parse text into integer or floating-point number',
    icon: Binary,
    badgeColor: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    category: 'numeric',
    hasConfig: false,
    example: { before: '"1049.50"', after: '1049.5' }
  },
  {
    id: 'replace',
    label: 'Replace Text',
    shortLabel: 'Replace',
    description: 'Find matching substring and replace with new value',
    icon: Replace,
    badgeColor: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    category: 'advanced',
    hasConfig: true,
    configFields: [
      { key: 'find', label: 'Find', placeholder: 'e.g. - or space', required: true },
      { key: 'replaceWith', label: 'Replace with', placeholder: 'e.g. _ or empty', required: false }
    ],
    example: { before: 'user-name-99', after: 'user_name_99' }
  },
  {
    id: 'prefix',
    label: 'Add Prefix',
    shortLabel: 'Prefix',
    description: 'Prepend custom string to the beginning',
    icon: PlusCircle,
    badgeColor: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    category: 'advanced',
    hasConfig: true,
    configFields: [
      { key: 'prefix', label: 'Prefix text', placeholder: 'e.g. ID_', required: true }
    ],
    example: { before: '1001', after: 'ID_1001' }
  },
  {
    id: 'suffix',
    label: 'Add Suffix',
    shortLabel: 'Suffix',
    description: 'Append custom string to the end',
    icon: MinusCircle,
    badgeColor: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 border-violet-200 dark:border-violet-800',
    category: 'advanced',
    hasConfig: true,
    configFields: [
      { key: 'suffix', label: 'Suffix text', placeholder: 'e.g. @domain.com', required: true }
    ],
    example: { before: 'admin', after: 'admin@domain.com' }
  },
  {
    id: 'default_value',
    label: 'Default Value',
    shortLabel: 'Default',
    description: 'Fallback value if source field is empty or null',
    icon: HelpCircle,
    badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    category: 'advanced',
    hasConfig: true,
    configFields: [
      { key: 'defaultValue', label: 'Default fallback value', placeholder: 'e.g. N/A or Unknown', required: true }
    ],
    example: { before: '(empty)', after: 'N/A' }
  }
];

/**
 * Get transformation metadata by ID
 * @param {string} id 
 */
export function getTransformationMeta(id = 'none') {
  const normId = (id || 'none').toLowerCase().replace(/\s+/g, '_');
  const found = TRANSFORMATIONS.find(t => t.id === normId);
  return found || TRANSFORMATIONS[0];
}

/**
 * Apply client-side transformation for instant interactive UI preview
 * @param {any} value 
 * @param {string} transformation 
 * @param {object} config 
 * @returns {any}
 */
export function applyClientTransformation(value, transformation = 'none', config = {}) {
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
 * Transform a record object on the client for live preview
 * @param {object} record 
 * @param {Array} mappings 
 * @param {string} unmappedFieldsMode 
 * @returns {object}
 */
export function transformClientRecord(record, mappings = [], unmappedFieldsMode = 'ignore') {
  if (!record || typeof record !== 'object') return record;

  const transformed = {};

  // Preserve internal properties starting with '_'
  for (const key of Object.keys(record)) {
    if (key.startsWith('_')) {
      transformed[key] = record[key];
    }
  }

  if (unmappedFieldsMode === 'keep') {
    for (const [k, v] of Object.entries(record)) {
      if (!k.startsWith('_')) {
        transformed[k] = v;
      }
    }
  }

  for (const rule of mappings) {
    const { sourceField, destinationField } = rule;
    if (!sourceField || !destinationField) continue;

    const transformType = rule.transformation || rule.transformRule || 'none';
    const config = rule.transformConfig || rule.config || {};
    const rawValue = record[sourceField];

    transformed[destinationField] = applyClientTransformation(rawValue, transformType, config);
  }

  return transformed;
}

export default {
  TRANSFORMATIONS,
  getTransformationMeta,
  applyClientTransformation,
  transformClientRecord
};
