import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, LayoutDashboard } from 'lucide-react';
import Button from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
      <div className="p-4 bg-slate-100 rounded-2xl text-slate-400 mb-4">
        <FileQuestion className="w-12 h-12" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">404 - Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md mt-2 mb-6">
        The requested screen does not exist or has been relocated within the StreamWeaver console.
      </p>
      <div className="flex items-center gap-3">
        <Link to="/">
          <Button variant="primary" leftIcon={LayoutDashboard}>
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
