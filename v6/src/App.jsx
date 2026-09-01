import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AdminRoute from '@/lib/AdminRoute';
import UserNotRegisteredError from '@/components/ui/UserNotRegisteredError';
import ScrollToTop from '@/components/ui/ScrollToTop';
import POSApp from '@/pages/POSApp';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import PendingApproval from '@/pages/PendingApproval';
import AdminLogin from '@/pages/admin/AdminLogin';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminProperties from '@/pages/admin/AdminProperties';
import AdminPropertyDetail from '@/pages/admin/AdminPropertyDetail';
import AdminAuditLog from '@/pages/admin/AdminAuditLog';
import SupabaseSetupNotice from '@/pages/SupabaseSetupNotice';
import { isSupabaseConfigured } from '@/lib/supabaseClient';

const AuthenticatedApp = () => {
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Platform owners don't operate a property's PMS/POS day-to-day — send
  // them to the admin console instead of the operational app.
  if (user?.isPlatformOwner) {
    return <Navigate to="/admin" replace />;
  }

  // A signed-in property user only gets the real PMS/POS once their
  // property is ACTIVE and has a package assigned. Anything else
  // (pending/rejected/suspended/inactive, or active with no package yet)
  // shows the onboarding/status screen instead — never the full app.
  const property = user?.property;
  const hasFullAccess = property?.status === 'active' && property?.package && property.package !== 'none';
  if (!hasFullAccess) {
    return <PendingApproval />;
  }

  // Render the main app
  return <POSApp />;
};

function AppRoutes() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Platform owner console — see src/lib/AdminRoute.jsx for the
            client-side guard and supabase/migrations for the server-side
            (RLS) enforcement that actually protects this data. */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/properties" element={<AdminProperties />} />
            <Route path="/admin/properties/:id" element={<AdminPropertyDetail />} />
            <Route path="/admin/audit-log" element={<AdminAuditLog />} />
          </Route>
        </Route>

        <Route path="/" element={<AuthenticatedApp />} />
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </AuthProvider>
  );
}

function App() {
  // Checked before anything that touches Supabase (auth, routing) so a
  // missing/unset .env produces a clear message instead of the app
  // silently failing every network call, or — worse — the blank white
  // screen that used to happen when supabaseClient.js threw at import time.
  if (!isSupabaseConfigured) {
    return <SupabaseSetupNotice />;
  }

  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <ScrollToTop />
        <AppRoutes />
      </Router>
      <Toaster />
    </QueryClientProvider>
  )
}

export default App
