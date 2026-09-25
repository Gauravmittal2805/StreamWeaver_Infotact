import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import Card, { CardHeader, CardBody } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    apiUrl: 'http://localhost:5001/api',
    maxFileSizeGb: '10',
    highWaterMarkKb: '64',
    storagePath: './uploads',
    autoQuarantineErrors: true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Settings</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure streaming upload buffer constraints, API connection endpoints, and storage targets.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Connection Settings */}
        <Card>
          <CardHeader
            title="Backend API Configuration"
            description="Manage backend connection endpoints and polling parameters"
          />
          <CardBody className="p-6 space-y-4">
            <Input
              label="Backend Base API URL"
              value={form.apiUrl}
              onChange={(e) => setForm({ ...form, apiUrl: e.target.value })}
              helperText="Endpoint for StreamWeaver Express backend server (default: http://localhost:5001/api)"
            />
          </CardBody>
        </Card>

        {/* Engine Stream Tuning */}
        <Card>
          <CardHeader
            title="Streaming Engine Tuning"
            description="Control Node.js backpressure stream chunks and memory ceiling"
          />
          <CardBody className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Max Upload Limit (GB)"
                type="number"
                value={form.maxFileSizeGb}
                onChange={(e) => setForm({ ...form, maxFileSizeGb: e.target.value })}
                helperText="Busboy streaming file limit"
              />
              <Input
                label="Stream HighWaterMark (KB)"
                type="number"
                value={form.highWaterMarkKb}
                onChange={(e) => setForm({ ...form, highWaterMarkKb: e.target.value })}
                helperText="Buffer chunk size for streaming backpressure"
              />
            </div>

            <Input
              label="Storage Destination Directory"
              value={form.storagePath}
              onChange={(e) => setForm({ ...form, storagePath: e.target.value })}
              helperText="Filesystem target path for raw uploaded datasets"
            />
          </CardBody>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <Check className="w-4 h-4" /> Settings updated successfully
            </span>
          )}
          <Button
            type="submit"
            variant="primary"
            leftIcon={Save}
          >
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}

export default SettingsPage;
