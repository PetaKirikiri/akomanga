import type { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { isHrAdminRole, useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalCard,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  hrNavTabs,
} from '@/components/portal/PortalLayout';

export function RequireHrRole({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { user, loading, appUser, clientId, signOut } = useAuth();
  const navTabs = hrNavTabs();

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

  if (!appUser || !isHrAdminRole(appUser.role)) {
    return <Navigate to="/home" replace />;
  }

  if (clientId == null) {
    return (
      <PortalShell
        sidebar={
          <PortalSidebar
            tabs={navTabs}
            footer={
              <PortalAccountFooter
                email={user.email}
                roleLabel="Coordinator"
                onSignOut={() => void signOut().then(() => navigate('/login'))}
              />
            }
          />
        }
        headerTitle="Coordinator Dashboard"
        headerTrailing={<PortalHeaderProfile name={user.email} roleLabel="Coordinator" />}
        mobileTabs={navTabs}
        mainClassName="mx-auto w-full max-w-lg flex-1 px-6 py-8"
      >
        <PortalCard className="p-6">
          <p className="text-sm font-medium text-portal-ink">HR access is not fully set up</p>
          <p className="mt-2 text-sm text-portal-muted">
            Your account has the HR role but no organisation (client) is assigned. Ask a platform admin to set{' '}
            <code className="text-xs">client_id</code> on your user.
          </p>
        </PortalCard>
      </PortalShell>
    );
  }

  return children;
}
