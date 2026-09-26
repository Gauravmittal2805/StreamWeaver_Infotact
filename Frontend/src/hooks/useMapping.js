import { useState, useEffect, useCallback, useMemo } from 'react';
import { mappingService } from '../services/mappingService';
import { applyClientTransformation, transformClientRecord } from '../utils/transformationUtils';

/**
 * Generate a unique ID for mappings
 * @returns {string}
 */
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'map_' + Math.random().toString(36).substring(2, 9);
};

/**
 * Normalizes a mapping object to have standard transformation properties
 * @param {object} m 
 * @returns {object}
 */
const normalizeMapping = (m) => ({
  id: m.id || generateId(),
  sourceField: m.sourceField || '',
  destinationField: m.destinationField || '',
  transformation: m.transformation || m.transformRule || 'none',
  transformRule: m.transformation || m.transformRule || 'none',
  transformConfig: m.transformConfig || m.config || {},
});

/**
 * Custom hook for managing ETL mapping and transformation states
 * @param {string} datasetId 
 * @param {Array} initialSampleRows
 * @returns {Object} Mapping state and handlers
 */
export function useMapping(datasetId, initialSampleRows = []) {
  const [mappings, setMappings] = useState([]);
  const [destinationFields, setDestinationFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSavedState, setLastSavedState] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

  // Preview state
  const [sampleRows, setSampleRows] = useState(initialSampleRows);
  const [previewComparisons, setPreviewComparisons] = useState([]);
  const [previewError, setPreviewError] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastPreviewedAt, setLastPreviewedAt] = useState(null);

  // Sync sampleRows when prop changes
  useEffect(() => {
    if (initialSampleRows && initialSampleRows.length > 0) {
      setSampleRows(initialSampleRows);
    }
  }, [initialSampleRows]);

  // Load saved mappings on mount or datasetId change
  useEffect(() => {
    let isMounted = true;
    
    if (!datasetId) {
      setMappings([]);
      setDestinationFields([]);
      setLastSavedState(null);
      setLastSavedAt(null);
      return;
    }

    const loadMappings = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await mappingService.getMappings(datasetId);
        if (isMounted) {
          const config = data.mapping || data;
          const loadedMappings = (config.mappings || []).map(normalizeMapping);
          const loadedDestinations = config.destinationFields || 
            Array.from(new Set(loadedMappings.map(m => m.destinationField).filter(Boolean)));
          
          setMappings(loadedMappings);
          setDestinationFields(loadedDestinations);
          
          setLastSavedState({
            mappings: loadedMappings,
            destinationFields: loadedDestinations,
          });
          
          if (config.updatedAt || data.updatedAt) {
            setLastSavedAt(new Date(config.updatedAt || data.updatedAt));
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Failed to load mappings');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadMappings();

    return () => {
      isMounted = false;
    };
  }, [datasetId]);

  // Compute if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!lastSavedState) {
      return mappings.length > 0 || destinationFields.length > 0;
    }
    
    // Normalize for comparison
    const currentMappingsClean = mappings.map(m => ({
      sourceField: m.sourceField,
      destinationField: m.destinationField,
      transformation: m.transformation || 'none',
      transformConfig: m.transformConfig || {}
    }));

    const savedMappingsClean = (lastSavedState.mappings || []).map(m => ({
      sourceField: m.sourceField,
      destinationField: m.destinationField,
      transformation: m.transformation || 'none',
      transformConfig: m.transformConfig || {}
    }));

    const isMappingsEqual = JSON.stringify(currentMappingsClean) === JSON.stringify(savedMappingsClean);
    const isDestinationsEqual = JSON.stringify(destinationFields) === JSON.stringify(lastSavedState.destinationFields);
    
    return !isMappingsEqual || !isDestinationsEqual;
  }, [mappings, destinationFields, lastSavedState]);

  // Validation logic
  const validate = useCallback(() => {
    const errors = [];
    
    // Check empty destinations
    if (destinationFields.some(f => !f || String(f).trim() === '')) {
      errors.push('Destination fields cannot be empty');
    }

    // Check duplicate destinations
    const uniqueDestinations = new Set(destinationFields);
    if (uniqueDestinations.size !== destinationFields.length) {
      errors.push('Destination fields must be unique');
    }

    // Check mapping completeness
    const invalidMappings = mappings.filter(m => !m.sourceField || !m.destinationField);
    if (invalidMappings.length > 0) {
      errors.push('All mappings must have both a source and destination field selected');
    }

    // Check transformation configs (e.g. replace requires find string)
    mappings.forEach((m, idx) => {
      if (m.transformation === 'replace') {
        if (!m.transformConfig || m.transformConfig.find === undefined || m.transformConfig.find === '') {
          errors.push(`Field '${m.destinationField || `Rule #${idx + 1}`}': Replace transformation requires a search pattern`);
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  }, [mappings, destinationFields]);

  // Run validation whenever mappings or destinations change
  useEffect(() => {
    validate();
  }, [mappings, destinationFields, validate]);

  /**
   * Add a new mapping
   */
  const addMapping = useCallback((sourceField = '', destinationField = '', transformation = 'none', transformConfig = {}) => {
    setMappings(prev => [
      ...prev,
      {
        id: generateId(),
        sourceField,
        destinationField,
        transformation,
        transformRule: transformation,
        transformConfig
      }
    ]);
  }, []);

  /**
   * Remove a mapping by id
   */
  const removeMapping = useCallback((mappingId) => {
    setMappings(prev => prev.filter(m => m.id !== mappingId));
  }, []);

  /**
   * Update a specific mapping field
   */
  const updateMappingField = useCallback((mappingId, field, value) => {
    setMappings(prev => prev.map(m => 
      m.id === mappingId ? { ...m, [field]: value } : m
    ));
  }, []);

  /**
   * Update transformation and config for a specific mapping
   */
  const updateTransformation = useCallback((mappingId, transformation, transformConfig = {}) => {
    setMappings(prev => prev.map(m => {
      if (m.id === mappingId) {
        return {
          ...m,
          transformation,
          transformRule: transformation,
          transformConfig: { ...transformConfig }
        };
      }
      return m;
    }));
  }, []);

  /**
   * Remove transformation from a mapping (reverts to 'none' direct mapping)
   */
  const removeTransformation = useCallback((mappingId) => {
    updateTransformation(mappingId, 'none', {});
  }, [updateTransformation]);

  /**
   * Reset transformation to last saved state for a mapping
   */
  const resetTransformation = useCallback((mappingId) => {
    if (!lastSavedState) {
      updateTransformation(mappingId, 'none', {});
      return;
    }
    const saved = (lastSavedState.mappings || []).find(m => m.id === mappingId || (m.sourceField && m.sourceField === mappings.find(curr => curr.id === mappingId)?.sourceField));
    if (saved) {
      updateTransformation(mappingId, saved.transformation || 'none', saved.transformConfig || {});
    } else {
      updateTransformation(mappingId, 'none', {});
    }
  }, [lastSavedState, mappings, updateTransformation]);

  /**
   * Add a destination field
   */
  const addDestinationField = useCallback((fieldName = '') => {
    setDestinationFields(prev => [...prev, fieldName]);
  }, []);

  /**
   * Remove a destination field
   */
  const removeDestinationField = useCallback((fieldName) => {
    setDestinationFields(prev => prev.filter(f => f !== fieldName));
    setMappings(prev => prev.map(m => 
      m.destinationField === fieldName ? { ...m, destinationField: '' } : m
    ));
  }, []);

  /**
   * Save mappings and transformations to backend/localStorage
   */
  const saveMapping = useCallback(async () => {
    if (!validate()) {
      setError('Please fix validation errors before saving');
      return false;
    }

    setLoading(true);
    setError(null);
    try {
      const mappingData = {
        mappings,
        destinationFields,
      };
      
      let savedResult;
      if (lastSavedState && lastSavedAt) {
        savedResult = await mappingService.updateMapping(datasetId, mappingData);
      } else {
        savedResult = await mappingService.saveMapping(datasetId, mappingData);
      }

      const savedMappingConfig = savedResult.mapping || savedResult;
      const loadedMappings = (savedMappingConfig.mappings || mappings).map(normalizeMapping);
      const loadedDestinations = savedMappingConfig.destinationFields || destinationFields;

      setMappings(loadedMappings);
      setDestinationFields(loadedDestinations);
      setLastSavedState({
        mappings: loadedMappings,
        destinationFields: loadedDestinations,
      });
      setLastSavedAt(new Date(savedMappingConfig.updatedAt || Date.now()));
      setValidationErrors([]);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to save mappings');
      return false;
    } finally {
      setLoading(false);
    }
  }, [datasetId, mappings, destinationFields, lastSavedState, lastSavedAt, validate]);

  /**
   * Reset to last saved state
   */
  const resetMapping = useCallback(() => {
    if (lastSavedState) {
      setMappings((lastSavedState.mappings || []).map(normalizeMapping));
      setDestinationFields(lastSavedState.destinationFields || []);
      setValidationErrors([]);
      setError(null);
    }
  }, [lastSavedState]);

  /**
   * Clear all mappings
   */
  const clearAllMappings = useCallback(() => {
    setMappings([]);
  }, []);

  /**
   * Request transformation preview (via Backend preview API with local calculation fallback)
   */
  const requestPreview = useCallback(async (rows = sampleRows) => {
    setIsPreviewLoading(true);
    setPreviewError(null);

    const activeRows = (rows && rows.length > 0) ? rows.slice(0, 10) : [];

    try {
      // Try Backend preview API first
      let previewResult = null;
      try {
        const apiRes = await mappingService.previewTransformation(datasetId, {
          mappings,
          sampleRows: activeRows,
          limit: 10
        });
        if (apiRes && apiRes.preview) {
          previewResult = apiRes.preview;
        }
      } catch (apiErr) {
        console.warn('Backend preview endpoint error, calculating on client:', apiErr.message);
      }

      // Fallback: Compute client-side preview
      if (!previewResult) {
        const comparisons = activeRows.map((row, rowIndex) => {
          const fields = mappings.map(rule => {
            const sourceVal = row[rule.sourceField];
            const targetVal = applyClientTransformation(sourceVal, rule.transformation, rule.transformConfig);
            return {
              sourceField: rule.sourceField,
              destinationField: rule.destinationField,
              transformation: rule.transformation || 'none',
              before: sourceVal !== undefined ? sourceVal : null,
              after: targetVal !== undefined ? targetVal : null
            };
          });

          return {
            rowIndex,
            raw: row,
            transformed: transformClientRecord(row, mappings),
            fields
          };
        });

        previewResult = {
          previewRowCount: comparisons.length,
          comparisons,
          transformedRows: comparisons.map(c => c.transformed)
        };
      }

      setPreviewComparisons(previewResult.comparisons || []);
      setLastPreviewedAt(new Date());
      return previewResult;
    } catch (err) {
      setPreviewError(err.message || 'Unable to generate preview');
      return null;
    } finally {
      setIsPreviewLoading(false);
    }
  }, [datasetId, mappings, sampleRows]);

  /**
   * Get unmapped source fields
   */
  const getUnmappedSourceFields = useCallback((sourceColumns = []) => {
    const mappedSources = new Set(mappings.map(m => m.sourceField).filter(Boolean));
    return sourceColumns.filter(col => !mappedSources.has(col));
  }, [mappings]);

  /**
   * Get mapped source fields
   */
  const getMappedSourceFields = useCallback((sourceColumns = []) => {
    const mappedSources = new Set(mappings.map(m => m.sourceField).filter(Boolean));
    return sourceColumns.filter(col => mappedSources.has(col));
  }, [mappings]);

  return {
    mappings,
    destinationFields,
    loading,
    error,
    hasUnsavedChanges,
    lastSavedAt,
    validationErrors,
    addMapping,
    removeMapping,
    updateMappingField,
    updateTransformation,
    removeTransformation,
    resetTransformation,
    addDestinationField,
    removeDestinationField,
    saveMapping,
    resetMapping,
    clearAllMappings,
    getUnmappedSourceFields,
    getMappedSourceFields,
    validate,
    // Preview states & triggers
    sampleRows,
    setSampleRows,
    previewComparisons,
    previewError,
    isPreviewLoading,
    lastPreviewedAt,
    requestPreview,
  };
}

export default useMapping;
