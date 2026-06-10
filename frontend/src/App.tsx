/**
 * src/App.tsx
 * Application routes. Public auth pages + protected workspace dashboard.
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import OAuthCallbackPage from './pages/OAuthCallbackPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacesPage from './pages/WorkspacesPage';
import TeamPage from './pages/TeamPage';
import WorkspaceSettingsPage from './pages/WorkspaceSettingsPage';
import ConnectedAccountsPage from './pages/ConnectedAccountsPage';
import PostsPage from './pages/PostsPage';
import PostComposerPage from './pages/PostComposerPage';
import AIContentPage from './pages/AIContentPage';
import CreativeStudioPage from './pages/CreativeStudioPage';
import PublishingLogsPage from './pages/PublishingLogsPage';
import SocialSelectPage from './pages/SocialSelectPage';
import SocialOAuthCallbackPage from './pages/SocialOAuthCallbackPage';
import AcceptInvitationPage from './pages/AcceptInvitationPage';
import AnalyticsPage from './pages/AnalyticsPage';
import NotificationsPage from './pages/NotificationsPage';
import BillingPage from './pages/BillingPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminRevenuePage from './pages/admin/AdminRevenuePage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminMonitoringPage from './pages/admin/AdminMonitoringPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              style: { background: '#111a2e', color: '#fff', border: '1px solid #1e2a44' },
            }}
          />
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
            <Route path="/invitations/accept" element={<AcceptInvitationPage />} />

            <Route
              path="/complete-profile"
              element={
                <ProtectedRoute>
                  <CompleteProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspaces"
              element={
                <ProtectedRoute>
                  <WorkspacesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/team"
              element={
                <ProtectedRoute>
                  <TeamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/settings"
              element={
                <ProtectedRoute>
                  <WorkspaceSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <ConnectedAccountsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts"
              element={
                <ProtectedRoute>
                  <PostsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts/new"
              element={
                <ProtectedRoute>
                  <PostComposerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/posts/:id/edit"
              element={
                <ProtectedRoute>
                  <PostComposerPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-content"
              element={
                <ProtectedRoute>
                  <AIContentPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/studio"
              element={
                <ProtectedRoute>
                  <CreativeStudioPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/publishing"
              element={
                <ProtectedRoute>
                  <PublishingLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social/select"
              element={
                <ProtectedRoute>
                  <SocialSelectPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/social/callback"
              element={
                <ProtectedRoute>
                  <SocialOAuthCallbackPage />
                </ProtectedRoute>
              }
            />
            <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><BillingPage /></ProtectedRoute>} />
            <Route path="/activity-logs" element={<ProtectedRoute><ActivityLogsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute minRole="ADMIN"><AdminDashboardPage /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute minRole="ADMIN"><AdminUsersPage /></ProtectedRoute>} />
            <Route path="/admin/revenue" element={<ProtectedRoute minRole="ADMIN"><AdminRevenuePage /></ProtectedRoute>} />
            <Route path="/admin/settings" element={<ProtectedRoute minRole="SUPER_ADMIN"><AdminSettingsPage /></ProtectedRoute>} />
            <Route path="/admin/monitoring" element={<ProtectedRoute minRole="ADMIN"><AdminMonitoringPage /></ProtectedRoute>} />
            <Route path="/admin/reports" element={<ProtectedRoute minRole="ADMIN"><AdminReportsPage /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
