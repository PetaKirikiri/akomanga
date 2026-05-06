import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  hrNavTabs,
} from '@/components/portal/PortalLayout';

const mainClass = 'mx-auto w-full max-w-4xl flex-1 space-y-8 px-6 py-8';

export const hrInputClass =
  'mt-1 w-full rounded-lg border border-portal-border bg-portal-surface px-3 py-2 text-sm text-portal-ink shadow-sm outline-none focus:border-portal-accent focus:ring-2 focus:ring-portal-ring/25';

export function HrPageShell({
  children,
  trailingExtra,
}: {
  children: ReactNode;
  trailingExtra?: ReactNode;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navTabs = hrNavTabs();

  let headerTitle = 'Coordinator Dashboard';
  if (location.pathname === '/hr/classes') headerTitle = 'Class Planning';
  else if (location.pathname === '/hr/students') headerTitle = 'Student Management';
  else if (location.pathname === '/hr/progress') headerTitle = 'Progress Monitoring';

  const footer = (
    <PortalAccountFooter
      email={user?.email}
      roleLabel="Coordinator"
      extra={trailingExtra}
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const headerTrailing = <PortalHeaderProfile name={user?.email ?? 'User'} roleLabel="Coordinator" />;

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={footer} brandSuffix="Coordinator" />}
      headerTitle={headerTitle}
      headerTrailing={headerTrailing}
      mobileTabs={navTabs}
      mainClassName={mainClass}
    >
      {children}
    </PortalShell>
  );
}
