import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Backend connectivity indicator badge with refresh button
 */
export function ConnectionBadge({ online, checking, onRefresh }) {
  if (checking) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
        <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
        <span>Checking API...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
          online
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}
        title={online ? 'Connected to StreamWeaver Backend' : 'Backend Server Offline (port 5000)'}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
          }`}
        />
        <span>{online ? 'API Online' : 'API Offline'}</span>
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
          title="Refresh server status"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default ConnectionBadge;
