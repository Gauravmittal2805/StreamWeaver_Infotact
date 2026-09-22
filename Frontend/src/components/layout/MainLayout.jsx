import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useBackendHealth } from '../../hooks/useBackendHealth';

export function MainLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { online, checking, checkNow } = useBackendHealth(15000);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <Header
          setMobileOpen={setMobileOpen}
          online={online}
          checking={checking}
          onRefreshHealth={checkNow}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ isBackendOnline: online, refreshHealth: checkNow }} />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
