import { Navigate, useNavigate } from 'react-router-dom';
import { isHrAdminRole, isStaffRole, useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalCard,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  portalNavTabs,
} from '@/components/portal/PortalLayout';
import HomeDashboard from '@/pages/HomeDashboard';

const homeMainClass = 'mx-auto w-full max-w-5xl flex-1 px-6 py-8';

/** Staff → `/admin`. Learners → dashboard on `/home` (overview mock until data is wired). */
export default function HomeRedirect() {
  const navigate = useNavigate();
  const { user, loading, appUser, refreshProfile, signOut } = useAuth();

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

  const footer = (
    <PortalAccountFooter
      email={user.email}
      roleLabel="Student"
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const headerTrailing = <PortalHeaderProfile name={user.email ?? 'User'} roleLabel="Student" />;
  const navTabs = portalNavTabs();

  if (!appUser) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
        headerTitle="Dashboard"
        headerTrailing={headerTrailing}
        mobileTabs={navTabs}
        mainClassName={`${homeMainClass} space-y-6`}
      >
        <PortalCard className="p-6">
          <p className="text-lg font-medium text-portal-ink">You&apos;re signed in.</p>
          <p className="mt-2 text-sm text-portal-muted">
            When your access is ready, your dashboard will show real progress here.
          </p>
          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="mt-6 text-sm font-medium text-portal-accent underline underline-offset-4 hover:text-portal-accent-muted"
          >
            Refresh
          </button>
        </PortalCard>
        <HomeDashboard accessPending />
      </PortalShell>
    );
  }

  if (isHrAdminRole(appUser.role)) {
    return <Navigate to="/hr" replace />;
  }

  if (isStaffRole(appUser.role)) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
      headerTitle="Dashboard"
      headerTrailing={headerTrailing}
      mobileTabs={navTabs}
      mainClassName={homeMainClass}
    >
      <HomeDashboard />
    </PortalShell>
  );
}
