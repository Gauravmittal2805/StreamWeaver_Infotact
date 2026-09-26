import React, { useState, useEffect } from 'react';
import { Settings2, Sparkles, Check, X } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getTransformationMeta } from '../../utils/transformationUtils';

/**
 * Modal to configure parameters for a transformation (e.g., Replace find/replaceWith, Prefix, Suffix, Default value).
 */
export function TransformationConfigModal({
  isOpen,
  onClose,
  mapping,
  onSaveConfig
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (mapping) {
      setFormData(mapping.transformConfig || {});
    }
  }, [mapping, isOpen]);

  if (!mapping) return null;

  const transformMeta = getTransformationMeta(mapping.transformation);
  const configFields = transformMeta.configFields || [];

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (e) => {
    e?.preventDefault();
    onSaveConfig(mapping.id, formData);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configure ${transformMeta.label}`}
      description={`Set parameters for transforming '${mapping.sourceField}' → '${mapping.destinationField}'.`}
    >
      <form onSubmit={handleSave} className="space-y-4 mt-3">
        {configFields.map((field) => (
          <div key={field.key} className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {field.label} {field.required && <span className="text-rose-500">*</span>}
            </label>
            <Input
              value={formData[field.key] ?? ''}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full text-sm"
              autoFocus={configFields[0]?.key === field.key}
            />
          </div>
        ))}

        {transformMeta.id === 'replace' && (
          <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300">
            <div className="font-semibold mb-0.5">Example:</div>
            <div>Find <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono">-</code> and Replace with <code className="px-1 py-0.5 bg-white dark:bg-slate-800 rounded font-mono">_</code></div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
          <Button variant="outline" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="sm" leftIcon={Check} type="submit">
            Apply Configuration
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default TransformationConfigModal;
