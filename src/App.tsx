import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { RequireHrRole } from '@/components/routing/RequireHrRole';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import AdminClassDetailPage from '@/pages/AdminClassDetailPage';
import AdminDashboard from '@/pages/AdminDashboard';
import AdminStudentProfilePage from '@/pages/AdminStudentProfilePage';
import AdminStudentsPage from '@/pages/AdminStudentsPage';
import HrClassesPage from '@/pages/hr/HrClassesPage';
import HrDashboard from '@/pages/hr/HrDashboard';
import HrProgressPage from '@/pages/hr/HrProgressPage';
import HrStudentsPage from '@/pages/hr/HrStudentsPage';
import HomeRedirect from '@/pages/HomeRedirect';
import Login from '@/pages/Login';
import SentenceStructures from '@/pages/SentenceStructures';
import StudentDashboard from '@/pages/StudentDashboard';
import Vocab from '@/pages/Vocab';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

/** Unknown paths: guests → login; signed-in users → home (avoids bouncing staff/students through /login). */
function CatchAllRedirect() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }
  return <Navigate to={user ? '/home' : '/login'} replace />;
}

function AppShell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/home"
          element={
            <RequireAuth>
              <HomeRedirect />
            </RequireAuth>
          }
        />
        <Route
          path="/vocab"
          element={
            <RequireAuth>
              <Vocab />
            </RequireAuth>
          }
        />
        <Route
          path="/sentence-structures"
          element={
            <RequireAuth>
              <SentenceStructures />
            </RequireAuth>
          }
        />
        <Route
          path="/student"
          element={
            <RequireAuth>
              <StudentDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminDashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/classes/:classId"
          element={
            <RequireAuth>
              <AdminClassDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/students"
          element={
            <RequireAuth>
              <AdminStudentsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin/students/:studentId"
          element={
            <RequireAuth>
              <AdminStudentProfilePage />
            </RequireAuth>
          }
        />
        <Route
          path="/hr"
          element={
            <RequireAuth>
              <RequireHrRole>
                <HrDashboard />
              </RequireHrRole>
            </RequireAuth>
          }
        />
        <Route
          path="/hr/classes"
          element={
            <RequireAuth>
              <RequireHrRole>
                <HrClassesPage />
              </RequireHrRole>
            </RequireAuth>
          }
        />
        <Route
          path="/hr/students"
          element={
            <RequireAuth>
              <RequireHrRole>
                <HrStudentsPage />
              </RequireHrRole>
            </RequireAuth>
          }
        />
        <Route
          path="/hr/progress"
          element={
            <RequireAuth>
              <RequireHrRole>
                <HrProgressPage />
              </RequireHrRole>
            </RequireAuth>
          }
        />
        <Route path="*" element={<CatchAllRedirect />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}
