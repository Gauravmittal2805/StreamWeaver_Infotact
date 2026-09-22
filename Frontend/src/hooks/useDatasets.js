import { useState, useEffect, useCallback } from 'react';
import { fileService } from '../services/fileService';

/**
 * Hook to fetch and manage datasets list
 */
export function useDatasets() {
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDatasets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fileService.getAllDatasets();
      setDatasets(data || []);
    } catch (err) {
      console.warn('Could not fetch datasets from backend:', err.message);
      setDatasets([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDataset = useCallback(async (datasetId) => {
    try {
      await fileService.deleteDataset(datasetId);
      setDatasets((prev) => prev.filter((d) => d.id !== datasetId));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    fileService
      .getAllDatasets()
      .then((data) => {
        if (mounted) {
          setDatasets(data || []);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          console.warn('Could not fetch datasets:', err.message);
          setDatasets([]);
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return {
    datasets,
    loading,
    error,
    refresh: fetchDatasets,
    deleteDataset,
  };
}
