import { useState, useRef, useCallback } from 'react';
import { fileService } from '../services/fileService';
import { validateDatasetFile } from '../utils/fileValidation';

export const UploadStates = {
  NO_FILE: 'no_file',
  FILE_SELECTED: 'file_selected',
  UPLOADING: 'uploading',
  UPLOAD_COMPLETED: 'upload_completed',
  UPLOAD_FAILED: 'upload_failed',
};

/**
 * Hook for managing the complete dataset upload lifecycle
 */
export function useFileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadState, setUploadState] = useState(UploadStates.NO_FILE);
  const [validationError, setValidationError] = useState(null);
  const [progress, setProgress] = useState({
    loaded: 0,
    total: 0,
    percent: 0,
    speedBps: 0,
    etaSeconds: null,
    elapsedSeconds: 0,
  });
  const [uploadResult, setUploadResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const abortRef = useRef(null);

  /**
   * Selects a file and validates it
   */
  const handleSelectFile = useCallback((file) => {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setUploadResult(null);

    const validation = validateDatasetFile(file);
    if (!validation.valid) {
      setSelectedFile(file);
      setValidationError(validation.error);
      setUploadState(UploadStates.UPLOAD_FAILED);
      setErrorMessage(validation.error);
      return false;
    }

    setSelectedFile(file);
    setValidationError(null);
    setUploadState(UploadStates.FILE_SELECTED);
    setProgress({
      loaded: 0,
      total: file.size,
      percent: 0,
      speedBps: 0,
      etaSeconds: null,
      elapsedSeconds: 0,
    });
    return true;
  }, []);

  /**
   * Clears selected file and resets to initial state
   */
  const handleRemoveFile = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
    }
    setSelectedFile(null);
    setValidationError(null);
    setErrorMessage(null);
    setUploadResult(null);
    setUploadState(UploadStates.NO_FILE);
    setProgress({
      loaded: 0,
      total: 0,
      percent: 0,
      speedBps: 0,
      etaSeconds: null,
      elapsedSeconds: 0,
    });
  }, []);

  /**
   * Starts uploading the file to Member 1's backend API
   */
  const startUpload = useCallback(async () => {
    if (!selectedFile) {
      setErrorMessage('Please select a CSV or JSON dataset first.');
      setUploadState(UploadStates.UPLOAD_FAILED);
      return;
    }

    // Re-validate
    const validation = validateDatasetFile(selectedFile);
    if (!validation.valid) {
      setValidationError(validation.error);
      setErrorMessage(validation.error);
      setUploadState(UploadStates.UPLOAD_FAILED);
      return;
    }

    setUploadState(UploadStates.UPLOADING);
    setErrorMessage(null);
    setProgress((prev) => ({ ...prev, percent: 0, loaded: 0, total: selectedFile.size }));

    try {
      const response = await fileService.uploadDataset(selectedFile, {
        onProgress: (prog) => {
          setProgress(prog);
        },
        onAbortRef: abortRef,
      });

      setUploadResult(response);
      setUploadState(UploadStates.UPLOAD_COMPLETED);
      return response;
    } catch (err) {
      console.error('Upload failed:', err);
      setErrorMessage(err.message || 'Dataset upload failed. Please try again.');
      setUploadState(UploadStates.UPLOAD_FAILED);
    }
  }, [selectedFile]);

  /**
   * Aborts active upload
   */
  const cancelUpload = useCallback(() => {
    if (abortRef.current) {
      abortRef.current();
      setErrorMessage('Upload was cancelled.');
      setUploadState(UploadStates.FILE_SELECTED);
    }
  }, []);

  return {
    selectedFile,
    uploadState,
    validationError,
    progress,
    uploadResult,
    errorMessage,
    selectFile: handleSelectFile,
    removeFile: handleRemoveFile,
    startUpload,
    cancelUpload,
    resetUpload: handleRemoveFile,
  };
}
