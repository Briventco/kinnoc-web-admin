import { BrowserRouter, Route, Routes } from 'react-router';
import { AuthProvider } from './auth/AuthProvider';
import { RequireAdmin } from './auth/RequireAdmin';
import { AdminLayout } from './layouts/AdminLayout';
import { CreateEventPage } from './pages/CreateEventPage';
import { EditEventPage } from './pages/EditEventPage';
import { EventDetailPage } from './pages/EventDetailPage';
import { EventsPage } from './pages/EventsPage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OverviewPage } from './pages/OverviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { ApplicationDetailPage } from './pages/verification/ApplicationDetailPage';
import { ApplicationsPage } from './pages/verification/ApplicationsPage';
import { GrantVerificationPage } from './pages/verification/GrantVerificationPage';
import { VerificationOverviewPage } from './pages/verification/VerificationOverviewPage';
import { VerificationUserPage } from './pages/verification/VerificationUserPage';
import { VerifiedUsersPage } from './pages/verification/VerifiedUsersPage';

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Everything below requires an administrator confirmed by GET /admin/me. */}
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="events/new" element={<CreateEventPage />} />
              <Route path="events/:id" element={<EventDetailPage />} />
              <Route path="events/:id/edit" element={<EditEventPage />} />
              <Route path="verification" element={<VerificationOverviewPage />} />
              <Route path="verification/applications" element={<ApplicationsPage />} />
              <Route path="verification/applications/:id" element={<ApplicationDetailPage />} />
              <Route path="verification/verified" element={<VerifiedUsersPage />} />
              <Route path="verification/users/:userRef" element={<VerificationUserPage />} />
              <Route path="verification/grant" element={<GrantVerificationPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
