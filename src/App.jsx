import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import AppLayout from '@/components/layout/AppLayout';
import Home from '@/pages/Home';
import Profile from '@/pages/Profile';
import Admin from '@/pages/Admin';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import { supabaseEnvError } from '@/api/supabaseClient';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors — only block on user_not_registered; everything else is public
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Any other auth/network error: just render the app anyway (public access)
  // Don't block on transient errors like unknown/network failures

  // Render the main app — accessible to all; pages handle unauthenticated state themselves
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/admin" element={<Admin />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  if (supabaseEnvError) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-4 py-8">
        <div className="max-w-2xl rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <h1 className="text-3xl font-semibold mb-4">Configuration error</h1>
          <p className="mb-4 text-slate-700">
            Your app is missing required Supabase environment variables.
            This site cannot connect to Supabase until those values are provided.
          </p>
          <div className="rounded-xl bg-slate-100 p-4 text-sm text-slate-800">
            <strong className="block mb-2">Please set these environment variables:</strong>
            <code className="block break-words">VITE_SUPABASE_URL</code>
            <code className="block break-words mt-1">VITE_SUPABASE_ANON_KEY</code>
          </div>
          <p className="mt-4 text-slate-500 text-sm">
            Then rebuild and redeploy the app.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App