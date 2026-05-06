import { useQuery } from '@tanstack/react-query';
import { Navigate, useNavigate } from 'react-router-dom';
import { isHrAdminRole, isStaffRole, useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalCard,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  portalNavForRole,
} from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';

type SentencePatternRow = { id: number; name: string; description: string | null; created_at: string };

export default function SentenceStructures() {
  const navigate = useNavigate();
  const { user, appUser, loading, signOut } = useAuth();
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const isStaffUser = Boolean(appUser && isStaffRole(appUser.role));

  const footer = isStaffUser ? (
    <PortalAccountFooter
      email={user?.email}
      roleLabel="Teacher"
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  ) : undefined;

  const headerTrailing = (
    <PortalHeaderProfile
      name={user?.email ?? 'User'}
      roleLabel={isStaffUser ? 'Teacher' : 'Student'}
    />
  );

  const patternsQuery = useQuery({
    queryKey: ['portal', 'sentence-patterns'],
    queryFn: async (): Promise<SentencePatternRow[]> => {
      const { data, error } = await supabase
        .from('sentence_patterns')
        .select('id, name, description, created_at')
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SentencePatternRow[];
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (appUser && isHrAdminRole(appUser.role)) {
    return <Navigate to="/hr" replace />;
  }

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
      headerTitle="Course"
      headerTrailing={headerTrailing}
      mobileTabs={navTabs}
      mainClassName="mx-auto w-full max-w-3xl flex-1 px-6 py-8"
    >
      <PortalCard className="p-8">
        <h1 className="text-lg font-semibold text-portal-ink">My Sentence Structures</h1>
        <p className="mt-2 text-sm text-portal-muted">Sentence patterns from the shared registry.</p>
        {patternsQuery.isPending ? (
          <p className="mt-6 text-sm text-portal-muted">Loading patterns…</p>
        ) : patternsQuery.isError ? (
          <p className="mt-6 text-sm text-portal-danger">{(patternsQuery.error as Error).message}</p>
        ) : (patternsQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-6 text-sm text-portal-muted">No sentence patterns yet.</p>
        ) : (
          <ul
            className="mt-6 divide-y divide-portal-border overflow-hidden rounded-lg border border-portal-border bg-portal-bg/40"
            aria-label="Sentence patterns"
          >
            {patternsQuery.data?.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <span className="text-base font-medium text-portal-ink">{p.name}</span>
                {p.description ? (
                  <p className="mt-1 text-sm text-portal-muted">{p.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </PortalShell>
  );
}
