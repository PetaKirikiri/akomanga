import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { isHrAdminRole, isStaffRole, useAuth } from '@/context/AuthContext';
import {
  PortalAccountFooter,
  PortalHeaderProfile,
  PortalShell,
  PortalSidebar,
  portalBtnSecondaryClass,
  portalNavForRole,
} from '@/components/portal/PortalLayout';
import { supabase } from '@/lib/supabase';

type TeacherClassRow = {
  id: number;
  label: string | null;
  level: string | null;
  meeting_weekday: number | null;
  meeting_start: string | null;
  meeting_end: string | null;
  clients: { name: string } | { name: string }[] | null;
  courses: { name: string } | { name: string }[] | null;
  class_sessions: { session_date: string; session_number: number }[] | null;
};

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatClassTime(start: string | null, end: string | null): string {
  if (!start) return 'Time TBC';
  return end ? `${start.slice(0, 5)}-${end.slice(0, 5)}` : start.slice(0, 5);
}

function formatClassDay(day: number | null): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return day == null ? 'Day TBC' : days[day] ?? 'Day TBC';
}

function nextSessionLabel(sessions: TeacherClassRow['class_sessions']): string {
  const today = new Date().toISOString().slice(0, 10);
  const nextSession = (sessions ?? [])
    .filter((session) => session.session_date >= today)
    .sort((a, b) => a.session_date.localeCompare(b.session_date))[0];
  return nextSession ? `Next session ${nextSession.session_number}: ${nextSession.session_date}` : 'No upcoming sessions';
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, appUser, loading, signOut } = useAuth();

  const staff = Boolean(appUser && isStaffRole(appUser.role));
  const isSuper = appUser?.role === 'super_admin';
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });

  const classesQuery = useQuery({
    queryKey: ['portal', 'teacher-classes', appUser?.id, isSuper],
    enabled: staff && appUser != null,
    queryFn: async () => {
      let query = supabase
        .from('classes')
        .select(
          'id, label, level, meeting_weekday, meeting_start, meeting_end, clients(name), courses(name), class_sessions(session_date, session_number)',
        )
        .order('id', { ascending: false });

      if (!isSuper) {
        query = query.or(`teacher_app_user_id.eq.${appUser!.id},coordinator_app_user_id.eq.${appUser!.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as TeacherClassRow[];
    },
  });

  const deniedAction = (
    <button type="button" onClick={() => navigate('/student')} className={portalBtnSecondaryClass}>
      My courses
    </button>
  );

  const deniedFooter = (
    <PortalAccountFooter
      email={user?.email}
      roleLabel={appUser && isHrAdminRole(appUser.role) ? 'Coordinator' : 'Student'}
      extra={appUser && isHrAdminRole(appUser.role) ? undefined : deniedAction}
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const deniedHeader = (
    <PortalHeaderProfile
      name={user?.email ?? 'User'}
      roleLabel={appUser && isHrAdminRole(appUser.role) ? 'Coordinator' : 'Student'}
    />
  );

  const staffFooter = (
    <PortalAccountFooter
      email={user?.email}
      roleLabel={isSuper ? 'Admin' : 'Teacher'}
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const staffHeader = <PortalHeaderProfile name={user?.email ?? 'User'} roleLabel={isSuper ? 'Admin' : 'Teacher'} />;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (!appUser || !isStaffRole(appUser.role)) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={portalNavForRole(appUser?.role, { adminIfStaff: true })} footer={deniedFooter} />}
        headerTitle="Dashboard"
        headerTrailing={deniedHeader}
        mobileTabs={portalNavForRole(appUser?.role, { adminIfStaff: true })}
        mainClassName="portal-flush-main"
      >
        <p className="portal-flush-section text-sm text-portal-muted">Admin access only.</p>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={staffFooter} />}
      headerTitle={isSuper ? 'All Classes' : 'My Classes'}
      headerTrailing={staffHeader}
      mobileTabs={navTabs}
      mainClassName="portal-flush-stack"
    >
      <section className="portal-flush-section">
        <h2 className="text-sm font-semibold text-portal-ink">{isSuper ? 'All classes' : 'My classes'}</h2>
        {classesQuery.isPending ? (
          <p className="mt-2 text-sm text-portal-muted">Loading…</p>
        ) : classesQuery.isError ? (
          <p className="mt-2 text-sm text-portal-danger">{(classesQuery.error as Error).message}</p>
        ) : (classesQuery.data?.length ?? 0) === 0 ? (
          <p className="mt-2 text-sm text-portal-muted">No classes assigned yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto border border-portal-border">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm text-portal-ink">
              <thead>
                <tr className="border-b border-portal-border bg-portal-bg/60 text-xs uppercase tracking-wide text-portal-muted">
                  <th className="p-3 font-medium">Class</th>
                  <th className="p-3 font-medium">Organization</th>
                  <th className="p-3 font-medium">Course</th>
                  <th className="p-3 font-medium">Level</th>
                  <th className="p-3 font-medium">Schedule</th>
                  <th className="p-3 font-medium">Next session</th>
                </tr>
              </thead>
              <tbody>
                {classesQuery.data?.map((classRow) => {
                  const client = firstRow(classRow.clients);
                  const course = firstRow(classRow.courses);
                  return (
                    <tr key={classRow.id} className="border-b border-portal-border/70 hover:bg-portal-bg">
                      <td className="p-3 font-medium">
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/classes/${classRow.id}`)}
                          className="text-left font-medium text-portal-ink underline-offset-4 hover:underline"
                        >
                          {classRow.label?.trim() || `Class #${classRow.id}`}
                        </button>
                      </td>
                      <td className="p-3 text-portal-muted">{client?.name ?? '—'}</td>
                      <td className="p-3 text-portal-muted">{course?.name ?? '—'}</td>
                      <td className="p-3 text-portal-muted">{classRow.level ?? '—'}</td>
                      <td className="p-3 text-portal-muted">
                        {formatClassDay(classRow.meeting_weekday)} · {formatClassTime(classRow.meeting_start, classRow.meeting_end)}
                      </td>
                      <td className="p-3 text-portal-muted">{nextSessionLabel(classRow.class_sessions)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </PortalShell>
  );
}
