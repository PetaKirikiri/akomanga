import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isHrAdminRole, isStaffRole, useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  portalNavForRole,
} from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';

type AppUserRow = {
  id: number;
  email: string;
  display_name: string | null;
  role: string;
  auth_user_id: string | null;
};
type StudentRow = { id: number; name: string; email: string | null };

const inputClass =
  'mt-1 w-full border border-portal-border bg-portal-surface px-2 py-1.5 text-sm text-portal-ink outline-none focus:border-portal-accent';

export default function AdminUserProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { userId } = useParams();
  const id = Number(userId);
  const { user, appUser, loading, signOut } = useAuth();
  const isSuper = appUser?.role === 'super_admin';
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('user');

  const profileQuery = useQuery({
    queryKey: ['portal', 'admin-user-profile', id],
    enabled: isSuper && Number.isFinite(id),
    queryFn: async () => {
      const [{ data: profile, error: profileError }, { data: student, error: studentError }] = await Promise.all([
        supabase
          .from('app_users')
          .select('id, email, display_name, role, auth_user_id')
          .eq('id', id)
          .maybeSingle(),
        supabase.from('students').select('id, name, email').eq('app_user_id', id).maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (studentError) throw studentError;
      return {
        profile: profile as AppUserRow | null,
        student: student as StudentRow | null,
      };
    },
  });

  const profile = profileQuery.data?.profile;
  const student = profileQuery.data?.student;

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? '');
    setEmail(profile.email);
    setRole(profile.role);
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const nextEmail = email.trim().toLowerCase();
      if (!nextEmail) throw new Error('Email is required.');

      const { error } = await supabase
        .from('app_users')
        .update({
          display_name: displayName.trim() || null,
          email: nextEmail,
          role,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['portal', 'admin-user-profile', id] }),
        qc.invalidateQueries({ queryKey: ['portal', 'admin-user-dashboard'] }),
      ]);
    },
  });

  const adminFooter = (
    <PortalAccountFooter email={user?.email} roleLabel="Admin" onSignOut={() => void signOut().then(() => navigate('/login'))} />
  );
  const deniedHeader = (
    <PortalHeaderProfile
      name={user?.email ?? 'User'}
      roleLabel={appUser && isHrAdminRole(appUser.role) ? 'Coordinator' : 'Student'}
    />
  );
  const adminHeader = <PortalHeaderProfile name={user?.email ?? 'User'} roleLabel="Admin" />;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">Loading…</div>;
  }

  if (!appUser || !isStaffRole(appUser.role) || !isSuper) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} />}
        headerTitle="User Profile"
        headerTrailing={deniedHeader}
        mobileTabs={navTabs}
        mainClassName="portal-flush-main"
      >
        <p className="portal-flush-section text-sm text-portal-muted">Admin access only.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={adminFooter} />}
      headerTitle="User Profile"
      headerTrailing={adminHeader}
      mobileTabs={navTabs}
      mainClassName="portal-flush-stack"
    >
      <section className="portal-flush-section">
        <Link to="/admin/students" className="text-xs font-medium text-portal-muted underline-offset-4 hover:underline">
          Back to users
        </Link>
        {profileQuery.isPending ? (
          <p className="mt-3 text-sm text-portal-muted">Loading…</p>
        ) : profileQuery.isError ? (
          <p className="mt-3 text-sm text-portal-danger">{(profileQuery.error as Error).message}</p>
        ) : !profile ? (
          <p className="mt-3 text-sm text-portal-muted">User not found.</p>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-semibold text-portal-ink">{profile.display_name ?? profile.email}</h2>
            <p className="mt-1 text-sm text-portal-muted">
              {profile.auth_user_id ? 'Linked account' : 'Invite/account row only'}
              {student ? ` · linked student #${student.id}` : ''}
            </p>
            <div className="mt-4 border border-portal-border p-3">
              <h3 className="text-sm font-semibold text-portal-ink">Edit user</h3>
              <p className="mt-1 text-xs text-portal-muted">
                This updates the portal profile row. Auth login email is managed separately by Supabase Auth.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Display name</span>
                  <input className={inputClass} value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Email</span>
                  <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Role</span>
                  <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="user">User</option>
                    <option value="coordinator">Teacher</option>
                    <option value="hr_admin">Coordinator</option>
                    <option value="super_admin">Admin</option>
                  </select>
                </label>
              </div>
              <button
                type="button"
                disabled={updateProfile.isPending}
                onClick={() => void updateProfile.mutateAsync().catch(() => {})}
                className="mt-3 border border-portal-border bg-portal-surface px-3 py-1.5 text-sm font-medium text-portal-ink hover:bg-portal-bg disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save user'}
              </button>
              {updateProfile.isError ? (
                <p className="mt-2 text-sm text-portal-danger">{(updateProfile.error as Error).message}</p>
              ) : null}
              {updateProfile.isSuccess ? <p className="mt-2 text-sm text-portal-muted">User saved.</p> : null}
            </div>
          </>
        )}
      </section>
    </PortalShell>
  );
}
