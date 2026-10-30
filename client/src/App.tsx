import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PageLoader } from './components/ui';
import { HOME_BY_ROLE, useAuth } from './context/AuthContext';
import { AppLayout } from './layouts/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import AdminOverview from './pages/admin/AdminOverview';
import CountersPage from './pages/admin/CountersPage';
import MealsPage from './pages/admin/MealsPage';
import MenuManagementPage from './pages/admin/MenuManagementPage';
import ReportsPage from './pages/admin/ReportsPage';
import StaffPage from './pages/admin/StaffPage';
import StudentsPage from './pages/admin/StudentsPage';
import MenuPage from './pages/shared/MenuPage';
import NotFoundPage from './pages/shared/NotFoundPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ProfilePage from './pages/shared/ProfilePage';
import ActivityPage from './pages/staff/ActivityPage';
import QueueConsole from './pages/staff/QueueConsole';
import GenerateTokenPage from './pages/student/GenerateTokenPage';
import MyTokensPage from './pages/student/MyTokensPage';
import StudentDashboard from './pages/student/StudentDashboard';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return <Navigate to={user ? HOME_BY_ROLE[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="/student" element={<ProtectedRoute roles={['STUDENT']}><StudentDashboard /></ProtectedRoute>} />
        <Route path="/student/generate" element={<ProtectedRoute roles={['STUDENT']}><GenerateTokenPage /></ProtectedRoute>} />
        <Route path="/student/tokens" element={<ProtectedRoute roles={['STUDENT']}><MyTokensPage /></ProtectedRoute>} />
        <Route path="/student/menu" element={<ProtectedRoute roles={['STUDENT']}><MenuPage /></ProtectedRoute>} />
        <Route path="/student/notifications" element={<ProtectedRoute roles={['STUDENT']}><NotificationsPage /></ProtectedRoute>} />

        <Route path="/staff" element={<ProtectedRoute roles={['STAFF']}><QueueConsole /></ProtectedRoute>} />
        <Route path="/staff/activity" element={<ProtectedRoute roles={['STAFF']}><ActivityPage /></ProtectedRoute>} />
        <Route path="/staff/menu" element={<ProtectedRoute roles={['STAFF']}><MenuPage /></ProtectedRoute>} />

        <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><AdminOverview /></ProtectedRoute>} />
        <Route path="/admin/counters" element={<ProtectedRoute roles={['ADMIN']}><CountersPage /></ProtectedRoute>} />
        <Route path="/admin/meals" element={<ProtectedRoute roles={['ADMIN']}><MealsPage /></ProtectedRoute>} />
        <Route path="/admin/menu" element={<ProtectedRoute roles={['ADMIN']}><MenuManagementPage /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute roles={['ADMIN']}><StaffPage /></ProtectedRoute>} />
        <Route path="/admin/students" element={<ProtectedRoute roles={['ADMIN']}><StudentsPage /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute roles={['ADMIN']}><ReportsPage /></ProtectedRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
