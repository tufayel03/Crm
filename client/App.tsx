
import React, { Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import { Loader2 } from 'lucide-react';

// Lazy Load Pages
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const ClientMeetings = lazy(() => import('./pages/ClientMeetings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Leads = lazy(() => import('./pages/Leads'));
const LeadDetail = lazy(() => import('./pages/LeadDetail'));
const Clients = lazy(() => import('./pages/Clients'));
const ClientDetail = lazy(() => import('./pages/ClientDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Meetings = lazy(() => import('./pages/Meetings'));
const EmailTemplates = lazy(() => import('./pages/EmailTemplates'));
const CampaignsActive = lazy(() => import('./pages/BulkEmail'));
const CampaignHistory = lazy(() => import('./pages/CampaignHistory'));
const CampaignResults = lazy(() => import('./pages/CampaignResults'));
const ServicePlans = lazy(() => import('./pages/ServicePlans'));
const Payments = lazy(() => import('./pages/Payments'));
const Settings = lazy(() => import('./pages/Settings'));
const Mailbox = lazy(() => import('./pages/Mailbox'));
const Database = lazy(() => import('./pages/Database'));
const ErrorLogs = lazy(() => import('./pages/ErrorLogs'));

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 size={40} className="text-darkGreen animate-spin" />
      <p className="text-sm font-bold text-textSecondary">Loading...</p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <Router>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<DashboardLayout />}>
            {/* Executive Dashboard - Restricted to Internal Team */}
            <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="dashboard"><Dashboard /></ProtectedRoute>} />

            {/* Client Portal Routes */}
            <Route path="/portal" element={<ProtectedRoute allowedRoles={['client']}><ClientPortal /></ProtectedRoute>} />
            <Route path="/client-meetings" element={<ProtectedRoute allowedRoles={['client']}><ClientMeetings /></ProtectedRoute>} />

            <Route path="/mailbox" element={<ProtectedRoute requiredPermission="mailbox"><Mailbox /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><Analytics /></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute requiredPermission="leads"><Leads /></ProtectedRoute>} />
            <Route path="/leads/:id" element={<ProtectedRoute requiredPermission="leads"><LeadDetail /></ProtectedRoute>} />
            <Route path="/clients" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="clients"><Clients /></ProtectedRoute>} />
            <Route path="/clients/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="clients"><ClientDetail /></ProtectedRoute>} />
            <Route path="/services" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><ServicePlans /></ProtectedRoute>} />
            <Route path="/database" element={<ProtectedRoute allowedRoles={['admin']}><Database /></ProtectedRoute>} />
            <Route path="/error-logs" element={<ProtectedRoute allowedRoles={['admin']}><ErrorLogs /></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute requiredPermission="tasks"><Tasks /></ProtectedRoute>} />
            <Route path="/meetings" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="meetings"><Meetings /></ProtectedRoute>} />

            <Route path="/email-templates" element={<ProtectedRoute allowedRoles={['admin', 'manager']}><EmailTemplates /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="campaigns"><Navigate to="/campaigns/history" replace /></ProtectedRoute>} />
            <Route path="/campaigns/active" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="campaigns"><CampaignsActive /></ProtectedRoute>} />
            <Route path="/campaigns/history" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="campaigns"><CampaignHistory /></ProtectedRoute>} />
            <Route path="/campaigns/:id" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="campaigns"><CampaignResults /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent']} requiredPermission="payments"><Payments /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin', 'manager', 'agent', 'client']} requiredPermission="settings"><Settings /></ProtectedRoute>} />
          </Route>

          <Route path="/" element={<Navigate to="/portal" replace />} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
};

export default App;
