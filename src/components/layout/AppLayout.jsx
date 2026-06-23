import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import AppHeader from './AppHeader';

export default function AppLayout() {
  const { user, isLoadingAuth, checkUserAuth } = useAuth();
  const [localUser, setLocalUser] = useState(null);

  // Merge auth context user with any local updates (e.g. profile saves)
  const effectiveUser = localUser || user;

  const setUser = async (updated) => {
    setLocalUser(updated);
    // Also refresh from server to stay in sync
    await checkUserAuth();
    setLocalUser(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={effectiveUser} />
      <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {isLoadingAuth ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-border border-t-primary rounded-full animate-spin" />
          </div>
        ) : (
          <Outlet context={{ user: effectiveUser, setUser }} />
        )}
      </main>
    </div>
  );
}