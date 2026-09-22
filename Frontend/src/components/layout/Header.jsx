import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Menu,
  Search,
  Bell,
  UploadCloud,
} from 'lucide-react';
import ConnectionBadge from '../common/ConnectionBadge';
import Button from '../ui/Button';

const pageTitles = {
  '/': { title: 'Platform Dashboard', subtitle: 'Overview of streaming ETL datasets, real-time jobs & system throughput' },
  '/upload': { title: 'Upload Dataset', subtitle: 'Stream large CSV and JSON datasets with automatic memory backpressure' },
  '/datasets': { title: 'Datasets Inventory', subtitle: 'Manage uploaded data sources and inspect structural readiness' },
  '/pipelines': { title: 'Pipeline Builder', subtitle: 'Design streaming transform pipelines (Day 2 Milestone)' },
  '/jobs': { title: 'ETL Processing Jobs', subtitle: 'Monitor active and completed distributed processing tasks' },
  '/history': { title: 'Execution History', subtitle: 'Audit log of previous pipeline runs and transformation metrics' },
  '/settings': { title: 'Platform Settings', subtitle: 'Configure ingestion chunk sizes, storage paths, and worker limits' },
};

export function Header({
  setMobileOpen,
  online,
  checking,
  onRefreshHealth,
}) {
  const location = useLocation();
  const currentMeta = pageTitles[location.pathname] || {
    title: 'StreamWeaver',
    subtitle: 'High-Throughput Streaming ETL Platform',
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Left side: Hamburger + Page context */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-400 hidden sm:inline">StreamWeaver</span>
            <span className="text-xs text-slate-300 hidden sm:inline">/</span>
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              {currentMeta.title}
            </h1>
          </div>
        </div>
      </div>

      {/* Right side: Global search, Health status, Quick action, Notifications, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Search input */}
        <div className="hidden md:flex items-center relative w-48 lg:w-64">
          <Search className="w-4 h-4 absolute left-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search datasets, jobs..."
            className="w-full bg-slate-50 text-xs text-slate-800 rounded-lg pl-9 pr-3 py-1.5 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-400"
          />
        </div>

        {/* Backend health status badge */}
        <ConnectionBadge
          online={online}
          checking={checking}
          onRefresh={onRefreshHealth}
        />

        {/* Quick Upload Action */}
        {location.pathname !== '/upload' && (
          <Link to="/upload" className="hidden sm:inline-flex">
            <Button
              size="sm"
              variant="primary"
              leftIcon={UploadCloud}
            >
              Upload
            </Button>
          </Link>
        )}

        {/* Notifications */}
        <button
          type="button"
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors relative cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 bg-indigo-600 rounded-full absolute top-1.5 right-1.5 ring-2 ring-white" />
        </button>

        {/* User Profile */}
        <div className="flex items-center pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-800 to-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-slate-100 shadow-xs cursor-pointer">
            SW
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
