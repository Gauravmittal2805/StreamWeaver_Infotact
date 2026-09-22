import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileSpreadsheet,
  FileCode,
  File,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Info,
} from 'lucide-react';
import Card, { CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import { useFileUpload, UploadStates } from '../hooks/useFileUpload';
import { formatBytes } from '../utils/formatters';

export function UploadPage() {
  const fileInputRef = useRef(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const {
    selectedFile,
    uploadState,
    progress,
    uploadResult,
    errorMessage,
    selectFile,
    removeFile,
    startUpload,
    cancelUpload,
    resetUpload,
  } = useFileUpload();

  // Drag & drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      selectFile(file);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      selectFile(e.target.files[0]);
    }
  };

  const handleCopyDatasetId = (id) => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const getFileIcon = (fileName = '') => {
    if (fileName.toLowerCase().endsWith('.csv')) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-600" />;
    }
    if (fileName.toLowerCase().endsWith('.json')) {
      return <FileCode className="w-8 h-8 text-indigo-600" />;
    }
    return <File className="w-8 h-8 text-slate-500" />;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header section */}
      <div className="space-y-1">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Upload Dataset</h2>
        <p className="text-sm text-slate-500">
          Upload your raw CSV or JSON dataset. StreamWeaver streams large files to persistent storage with constant memory consumption.
        </p>
      </div>

      {/* Upload card container */}
      <Card className="border-slate-200 shadow-sm">
        <CardBody className="p-6 sm:p-8">
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv, .json, text/csv, application/json"
            className="hidden"
            onChange={handleFileInputChange}
          />

          {/* STATE 1: NO FILE SELECTED */}
          {uploadState === UploadStates.NO_FILE && (
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? 'border-indigo-500 bg-indigo-50/50 scale-[1.008]'
                  : 'border-slate-300 hover:border-slate-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className={`p-4 rounded-2xl transition-transform duration-200 ${
                  isDragOver ? 'bg-indigo-100 text-indigo-600 scale-110' : 'bg-white text-indigo-600 shadow-xs border border-slate-200/80'
                }`}>
                  <UploadCloud className="w-10 h-10 stroke-[1.75]" />
                </div>

                <div className="space-y-1">
                  <p className="text-base font-semibold text-slate-800">
                    <span className="text-indigo-600 hover:underline">Click to browse</span> or drag and drop your dataset
                  </p>
                  <p className="text-xs text-slate-500">
                    Supports high-volume datasets up to 10 GB with streaming backpressure
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Badge variant="default" size="md">
                    <span className="font-mono font-semibold">.CSV</span>
                  </Badge>
                  <Badge variant="default" size="md">
                    <span className="font-mono font-semibold">.JSON</span>
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: FILE SELECTED & READY TO UPLOAD */}
          {uploadState === UploadStates.FILE_SELECTED && selectedFile && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    {getFileIcon(selectedFile.name)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900 text-base truncate">
                        {selectedFile.name}
                      </h4>
                      <Badge variant="purple" size="sm">
                        {selectedFile.name.endsWith('.csv') ? 'CSV' : 'JSON'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {formatBytes(selectedFile.size)} • Ready for stream upload
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={removeFile}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={removeFile}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  leftIcon={UploadCloud}
                  onClick={startUpload}
                >
                  Start Stream Upload
                </Button>
              </div>
            </div>
          )}

          {/* STATE 3: UPLOADING / STREAMING ACTIVE */}
          {uploadState === UploadStates.UPLOADING && selectedFile && (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <RefreshCw className="w-6 h-6 animate-spin" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900 text-base">
                      Uploading {selectedFile.name}
                    </h4>
                    <p className="text-xs text-indigo-600 font-medium mt-0.5">
                      Streaming chunks with backpressure handling...
                    </p>
                  </div>
                </div>

                <Badge variant="info" size="md">
                  {progress.percent}%
                </Badge>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <ProgressBar
                  progress={progress.percent}
                  size="md"
                  variant="indigo"
                />

                <div className="flex items-center justify-between text-xs font-mono text-slate-500 pt-1">
                  <span>
                    {formatBytes(progress.loaded)} / {formatBytes(progress.total)}
                  </span>
                  <span>
                    {progress.speedBps > 0 && `${formatBytes(progress.speedBps)}/s`}
                    {progress.etaSeconds !== null && ` • ETA: ${progress.etaSeconds}s`}
                  </span>
                </div>
              </div>

              {/* Cancel Button */}
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelUpload}
                >
                  Cancel Upload
                </Button>
              </div>
            </div>
          )}

          {/* STATE 4: UPLOAD COMPLETED (SUCCESS) */}
          {uploadState === UploadStates.UPLOAD_COMPLETED && uploadResult && (
            <div className="space-y-6 py-2">
              <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-emerald-500 text-white rounded-xl shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-base font-bold text-emerald-950">
                      Dataset Uploaded Successfully
                    </h3>
                    <p className="text-xs text-emerald-800">
                      {uploadResult.message || 'Dataset is validated and stored ready for ETL transformations.'}
                    </p>
                  </div>
                </div>

                {/* Metadata info grid */}
                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white/80 p-4 rounded-xl border border-emerald-100 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Dataset ID</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="font-mono font-bold text-slate-900 truncate">
                        {uploadResult.dataset?.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyDatasetId(uploadResult.dataset?.id)}
                        className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                        title="Copy dataset ID"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">File Name</span>
                    <span className="font-medium text-slate-800 truncate block mt-0.5">
                      {uploadResult.dataset?.filename || selectedFile?.name}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Size</span>
                    <span className="font-mono font-medium text-slate-800 block mt-0.5">
                      {formatBytes(uploadResult.dataset?.size || selectedFile?.size)}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Upload Duration</span>
                    <span className="font-mono font-medium text-slate-800 block mt-0.5">
                      {uploadResult.metrics?.duration ? `${uploadResult.metrics.duration}s` : 'Completed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Next Action Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                >
                  Upload Another Dataset
                </Button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Link to="/datasets" className="w-full sm:w-auto">
                    <Button
                      variant="primary"
                      rightIcon={ArrowRight}
                      className="w-full sm:w-auto"
                    >
                      View in Datasets Inventory
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* STATE 5: UPLOAD FAILED / ERROR STATE */}
          {uploadState === UploadStates.UPLOAD_FAILED && (
            <div className="space-y-6 py-2">
              <div className="p-6 rounded-2xl bg-rose-50/70 border border-rose-200">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-rose-600 text-white rounded-xl shadow-sm">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-base font-bold text-rose-950">
                      Upload Could Not Be Completed
                    </h3>
                    <p className="text-xs text-rose-800 leading-relaxed">
                      {errorMessage || 'An error occurred during dataset transfer. Please check server availability and try again.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={resetUpload}
                >
                  Reset
                </Button>
                {selectedFile && (
                  <Button
                    variant="primary"
                    leftIcon={RefreshCw}
                    onClick={startUpload}
                  >
                    Retry Upload
                  </Button>
                )}
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Architecture & Format Guidelines Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 bg-white">
          <div className="flex items-center gap-2.5 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Format Validation</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Strict client and server verification for standard comma-separated (<span className="font-mono">.csv</span>) and JSON array/NDJSON (<span className="font-mono">.json</span>) schemas.
          </p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1.5">
            <Zap className="w-4 h-4" />
            <span>Streaming Busboy</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Pipes file streams straight to the filesystem via backpressured write streams to prevent NodeJS garbage collection spikes.
          </p>
        </Card>

        <Card className="p-4 bg-white">
          <div className="flex items-center gap-2.5 text-sky-600 font-bold text-xs uppercase tracking-wider mb-1.5">
            <Info className="w-4 h-4" />
            <span>Memory Safe</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            The browser never parses the full dataset into JavaScript memory, permitting smooth uploads of datasets exceeding 5GB+.
          </p>
        </Card>
      </div>
    </div>
  );
}

export default UploadPage;
