import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
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
type StudentRow = { id: number; name: string; email: string | null; app_user_id: number | null };
type EnrollmentRow = {
  student_id: number;
  classes: { clients: { name: string } | { name: string }[] | null } | { clients: { name: string } | { name: string }[] | null }[] | null;
};
type ProgressRow = {
  student_id: number;
  progress_score: number | string | null;
  evidence_count: number | null;
  last_updated_at: string | null;
};
type UserDashboardRow = {
  key: string;
  studentId: number | null;
  appUserId: number | null;
  name: string;
  email: string | null;
  role: string;
  memberStatus: string;
  organizationName: string;
  classCount: number;
  capabilityCount: number;
  averageProgress: string;
  evidenceCount: number;
  lastUpdatedAt: string | null;
};
type UserSortKey = 'organization' | 'name' | 'memberStatus' | 'classes' | 'progress' | 'updated';

function averageProgress(rows: ProgressRow[]): string {
  const scores = rows.map((row) => Number(row.progress_score)).filter(Number.isFinite);
  if (scores.length === 0) return '—';
  return `${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)}%`;
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function progressSortValue(value: string): number {
  return value === '—' ? -1 : Number(value.replace('%', ''));
}

function compareText(a: string | undefined, b: string | undefined): number {
  return (a ?? '').localeCompare(b ?? '');
}

function memberStatusFor(user: AppUserRow | null, student: StudentRow | null): string {
  if (user?.role === 'super_admin') return 'Admin';
  if (user?.role === 'hr_admin') return user.auth_user_id ? 'Coordinator' : 'Coordinator invite';
  if (user?.role === 'coordinator') return user.auth_user_id ? 'Teacher' : 'Teacher invite';
  if (user?.role === 'user' && student) return user.auth_user_id ? 'Student member' : 'Student invite';
  if (user?.role === 'user') return user.auth_user_id ? 'Account only' : 'Invite sent';
  if (student) return 'Roster only';
  return 'Unknown';
}

function displayNameFor(user: AppUserRow | null, student: StudentRow | null): string {
  return student?.name || user?.display_name || user?.email || 'Unnamed user';
}

function buildUserRows(
  users: AppUserRow[],
  students: StudentRow[],
  enrollments: EnrollmentRow[],
  progress: ProgressRow[],
): UserDashboardRow[] {
  const enrollmentsByStudent = new Map<number, number>();
  const organizationsByStudent = new Map<number, Set<string>>();
  const progressByStudent = new Map<number, ProgressRow[]>();
  const studentsByAppUser = new Map<number, StudentRow>();

  for (const enrollment of enrollments) {
    enrollmentsByStudent.set(enrollment.student_id, (enrollmentsByStudent.get(enrollment.student_id) ?? 0) + 1);
    const classRows = Array.isArray(enrollment.classes) ? enrollment.classes : enrollment.classes ? [enrollment.classes] : [];
    for (const classRow of classRows) {
      const client = firstRow(classRow.clients);
      if (!client?.name) continue;
      const organizations = organizationsByStudent.get(enrollment.student_id) ?? new Set<string>();
      organizations.add(client.name);
      organizationsByStudent.set(enrollment.student_id, organizations);
    }
  }

  for (const row of progress) {
    const rows = progressByStudent.get(row.student_id) ?? [];
    rows.push(row);
    progressByStudent.set(row.student_id, rows);
  }

  for (const student of students) {
    if (student.app_user_id != null) studentsByAppUser.set(student.app_user_id, student);
  }

  const rows = users.map((user): UserDashboardRow => {
    const student = studentsByAppUser.get(user.id) ?? null;
    const studentId = student?.id ?? null;
    const progressRows = studentId == null ? [] : progressByStudent.get(studentId) ?? [];
    const lastUpdatedAt =
      progressRows
        .map((row) => row.last_updated_at)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => b.localeCompare(a))[0] ?? null;

    return {
      key: `app-${user.id}`,
      studentId,
      appUserId: user.id,
      name: displayNameFor(user, student),
      email: user.email || student?.email || null,
      role: user.role,
      memberStatus: memberStatusFor(user, student),
      organizationName: studentId == null ? '—' : [...(organizationsByStudent.get(studentId) ?? [])].sort((a, b) => a.localeCompare(b)).join(', ') || '—',
      classCount: studentId == null ? 0 : enrollmentsByStudent.get(studentId) ?? 0,
      capabilityCount: progressRows.length,
      averageProgress: averageProgress(progressRows),
      evidenceCount: progressRows.reduce((sum, row) => sum + (row.evidence_count ?? 0), 0),
      lastUpdatedAt,
    };
  });

  const linkedStudentIds = new Set(rows.map((row) => row.studentId).filter((id): id is number => id != null));
  for (const student of students) {
    if (linkedStudentIds.has(student.id)) continue;
    const progressRows = progressByStudent.get(student.id) ?? [];
    const lastUpdatedAt =
      progressRows
        .map((row) => row.last_updated_at)
        .filter((value): value is string => Boolean(value))
        .sort((a, b) => b.localeCompare(a))[0] ?? null;
    rows.push({
      key: `student-${student.id}`,
      studentId: student.id,
      appUserId: null,
      name: displayNameFor(null, student),
      email: student.email,
      role: 'user',
      memberStatus: memberStatusFor(null, student),
      organizationName: [...(organizationsByStudent.get(student.id) ?? [])].sort((a, b) => a.localeCompare(b)).join(', ') || '—',
      classCount: enrollmentsByStudent.get(student.id) ?? 0,
      capabilityCount: progressRows.length,
      averageProgress: averageProgress(progressRows),
      evidenceCount: progressRows.reduce((sum, row) => sum + (row.evidence_count ?? 0), 0),
      lastUpdatedAt,
    });
  }

  return rows;
}

export default function AdminStudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, appUser, loading, signOut } = useAuth();
  const [sortKey, setSortKey] = useState<UserSortKey>('organization');
  const isSuper = appUser?.role === 'super_admin';
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });

  const studentsQuery = useQuery({
    queryKey: ['portal', 'admin-user-dashboard'],
    enabled: isSuper,
    queryFn: async () => {
      const [{ data: users, error: usersError }, { data: students, error: studentsError }, { data: enrollments, error: enrollmentsError }, { data: progress, error: progressError }] =
        await Promise.all([
          supabase.from('app_users').select('id, email, display_name, role, auth_user_id').order('email'),
          supabase.from('students').select('id, name, email, app_user_id').order('name'),
          supabase.from('class_enrollments').select('student_id, classes(clients(name))'),
          supabase
            .from('student_capability_progress')
            .select('student_id, progress_score, evidence_count, last_updated_at'),
        ]);

      if (usersError) throw usersError;
      if (studentsError) throw studentsError;
      if (enrollmentsError) throw enrollmentsError;
      if (progressError) throw progressError;

      return buildUserRows(
        (users ?? []) as AppUserRow[],
        (students ?? []) as StudentRow[],
        (enrollments ?? []) as EnrollmentRow[],
        (progress ?? []) as ProgressRow[],
      );
    },
  });

  const sortedStudents = useMemo(() => {
    const rows = [...(studentsQuery.data ?? [])];
    return rows.sort((a, b) => {
      if (sortKey === 'organization') return compareText(a.organizationName, b.organizationName) || compareText(a.name, b.name);
      if (sortKey === 'memberStatus') return compareText(a.memberStatus, b.memberStatus) || compareText(a.name, b.name);
      if (sortKey === 'classes') return b.classCount - a.classCount || compareText(a.name, b.name);
      if (sortKey === 'progress') return progressSortValue(b.averageProgress) - progressSortValue(a.averageProgress) || compareText(a.name, b.name);
      if (sortKey === 'updated') return compareText(b.lastUpdatedAt ?? '', a.lastUpdatedAt ?? '') || compareText(a.name, b.name);
      return compareText(a.name, b.name);
    });
  }, [sortKey, studentsQuery.data]);

  const deleteStudent = useMutation({
    mutationFn: async (student: UserDashboardRow) => {
      if (student.studentId == null) throw new Error('This user does not have a student profile to delete.');
      const ok = window.confirm(`Delete ${student.name}? This removes their student dashboard rows, not their auth login.`);
      if (!ok) return;

      const [{ error: progressError }, { error: enrollmentsError }] = await Promise.all([
        supabase.from('student_capability_progress').delete().eq('student_id', student.studentId),
        supabase.from('class_enrollments').delete().eq('student_id', student.studentId),
      ]);
      if (progressError) throw progressError;
      if (enrollmentsError) throw enrollmentsError;

      const { error } = await supabase.from('students').delete().eq('id', student.studentId);
      if (error) throw error;
    },
    onSuccess: async (_data, student) => {
      await qc.invalidateQueries({ queryKey: ['portal', 'admin-user-dashboard'] });
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (!appUser || !isStaffRole(appUser.role) || !isSuper) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} />}
        headerTitle="Users"
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
      headerTitle="Users"
      headerTrailing={adminHeader}
      mobileTabs={navTabs}
      mainClassName="portal-flush-stack"
    >
      <section className="portal-flush-section">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-portal-ink">Users dashboard</h2>
          <label className="flex items-center gap-2 text-sm text-portal-muted">
            <span>Sort</span>
            <select
              className="border border-portal-border bg-portal-surface px-2 py-1 text-sm text-portal-ink outline-none"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as UserSortKey)}
            >
              <option value="organization">Organization</option>
              <option value="name">Name</option>
              <option value="memberStatus">Member status</option>
              <option value="classes">Classes</option>
              <option value="progress">Progress</option>
              <option value="updated">Last update</option>
            </select>
          </label>
        </div>
        {studentsQuery.isPending ? (
          <p className="mt-2 text-sm text-portal-muted">Loading…</p>
        ) : studentsQuery.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(studentsQuery.error as Error).message}</p>
        ) : (studentsQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-portal-muted">No users yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-portal-border">
            <table className="w-full min-w-[56rem] border-collapse text-left text-sm text-portal-ink">
              <thead>
                <tr className="border-b border-portal-border bg-portal-bg/60 text-xs uppercase tracking-wide text-portal-muted">
                  <th className="p-3 font-medium">User</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Member status</th>
                  <th className="p-3 font-medium">Organization</th>
                  <th className="p-3 font-medium">Classes</th>
                  <th className="p-3 font-medium">Capabilities</th>
                  <th className="p-3 font-medium">Avg progress</th>
                  <th className="p-3 font-medium">Evidence</th>
                  <th className="p-3 font-medium">Last update</th>
                  <th className="p-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((student) => (
                  <tr key={student.key} className="border-b border-portal-border/70 hover:bg-portal-bg">
                    <td className="p-3 font-medium">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(student.appUserId != null ? `/admin/users/${student.appUserId}` : `/admin/students/${student.studentId}`)
                        }
                        className="text-left font-medium text-portal-ink underline-offset-4 hover:underline"
                      >
                        {student.name}
                      </button>
                    </td>
                    <td className="p-3 text-portal-muted">{student.email ?? '—'}</td>
                    <td className="p-3 text-portal-muted">{student.memberStatus}</td>
                    <td className="p-3 text-portal-muted">{student.organizationName}</td>
                    <td className="p-3">{student.classCount}</td>
                    <td className="p-3">{student.capabilityCount}</td>
                    <td className="p-3">{student.averageProgress}</td>
                    <td className="p-3">{student.evidenceCount}</td>
                    <td className="p-3 text-portal-muted">{formatDate(student.lastUpdatedAt)}</td>
                    <td className="p-3">
                      <button
                        type="button"
                        disabled={deleteStudent.isPending || student.studentId == null}
                        onClick={() => void deleteStudent.mutateAsync(student).catch(() => {})}
                        className="text-xs font-medium text-portal-danger underline-offset-4 hover:underline disabled:opacity-50"
                      >
                        {student.studentId == null ? '—' : 'Delete'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {deleteStudent.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(deleteStudent.error as Error).message}</p>
        ) : null}
      </section>
    </PortalShell>
  );
}
