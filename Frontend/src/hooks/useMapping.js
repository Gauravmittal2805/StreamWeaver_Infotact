import { useState, useEffect, useCallback, useMemo } from 'react';
import { mappingService } from '../services/mappingService';

/**
 * Generate a unique ID for mappings
 * @returns {string}
 */
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 9);
};

/**
 * Custom hook for managing ETL mapping states
 * @param {string} datasetId 
 * @returns {Object} Mapping state and handlers
 */
export function useMapping(datasetId) {
  const [mappings, setMappings] = useState([]);
  const [destinationFields, setDestinationFields] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSavedState, setLastSavedState] = useState(null);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);

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
          const loadedMappings = data.mappings || [];
          const loadedDestinations = data.destinationFields || [];
          
          setMappings(loadedMappings);
          setDestinationFields(loadedDestinations);
          
          setLastSavedState({
            mappings: loadedMappings,
            destinationFields: loadedDestinations,
          });
          
          if (data.updatedAt) {
            setLastSavedAt(new Date(data.updatedAt));
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
    if (!lastSavedState) return mappings.length > 0 || destinationFields.length > 0;
    
    // Simple deep equality check for arrays
    const isMappingsEqual = JSON.stringify(mappings) === JSON.stringify(lastSavedState.mappings);
    const isDestinationsEqual = JSON.stringify(destinationFields) === JSON.stringify(lastSavedState.destinationFields);
    
    return !isMappingsEqual || !isDestinationsEqual;
  }, [mappings, destinationFields, lastSavedState]);

  // Validation logic
  const validate = useCallback(() => {
    const errors = [];
    
    // Check empty destinations
    if (destinationFields.some(f => !f || f.trim() === '')) {
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
  const addMapping = useCallback((sourceField = '', destinationField = '') => {
    setMappings(prev => [...prev, { sourceField, destinationField, id: generateId() }]);
  }, []);

  /**
   * Remove a mapping by id
   */
  const removeMapping = useCallback((mappingId) => {
    setMappings(prev => prev.filter(m => m.id !== mappingId));
  }, []);

  /**
   * Update a specific mapping
   */
  const updateMappingField = useCallback((mappingId, field, value) => {
    setMappings(prev => prev.map(m => 
      m.id === mappingId ? { ...m, [field]: value } : m
    ));
  }, []);

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
    // Also remove from any mappings using this destination
    setMappings(prev => prev.map(m => 
      m.destinationField === fieldName ? { ...m, destinationField: '' } : m
    ));
  }, []);

  /**
   * Save mappings to backend/localStorage
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
      
      let savedData;
      // If we have a lastSavedAt, assume it's an update. 
      // A more robust way might be checking if mappingService provides a clear insert vs update, 
      // but here we just use updateMapping for simplicity if it already exists.
      if (lastSavedState && lastSavedAt) {
        savedData = await mappingService.updateMapping(datasetId, mappingData);
      } else {
        savedData = await mappingService.saveMapping(datasetId, mappingData);
      }

      setLastSavedState({
        mappings: savedData.mappings,
        destinationFields: savedData.destinationFields,
      });
      setLastSavedAt(new Date(savedData.updatedAt));
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
      setMappings(lastSavedState.mappings);
      setDestinationFields(lastSavedState.destinationFields);
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
   * Get unmapped source fields
   * @param {string[]} sourceColumns 
   * @returns {string[]}
   */
  const getUnmappedSourceFields = useCallback((sourceColumns = []) => {
    const mappedSources = new Set(mappings.map(m => m.sourceField).filter(Boolean));
    return sourceColumns.filter(col => !mappedSources.has(col));
  }, [mappings]);

  /**
   * Get mapped source fields
   * @param {string[]} sourceColumns 
   * @returns {string[]}
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
    addDestinationField,
    removeDestinationField,
    saveMapping,
    resetMapping,
    clearAllMappings,
    getUnmappedSourceFields,
    getMappedSourceFields,
    validate,
  };
}

export default useMapping;
