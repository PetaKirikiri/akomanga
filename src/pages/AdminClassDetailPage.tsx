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

type ClassRow = {
  id: number;
  client_id: number | null;
  course_id: number | null;
  label: string | null;
  meeting_weekday: number | null;
  meeting_start: string | null;
  meeting_end: string | null;
  session_weeks: number | null;
};
type LookupRow = { id: number; name: string };

const inputClass =
  'mt-1 w-full border border-portal-border bg-portal-surface px-2 py-1.5 text-sm text-portal-ink outline-none focus:border-portal-accent';

function toTimeInput(value: string | null): string {
  return value ? value.slice(0, 5) : '';
}

export default function AdminClassDetailPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { classId } = useParams();
  const id = Number(classId);
  const { user, appUser, loading, signOut } = useAuth();
  const isSuper = appUser?.role === 'super_admin';
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const [label, setLabel] = useState('');
  const [clientId, setClientId] = useState<number | ''>('');
  const [courseId, setCourseId] = useState<number | ''>('');
  const [weekday, setWeekday] = useState<number | ''>('');
  const [meetingStart, setMeetingStart] = useState('');
  const [meetingEnd, setMeetingEnd] = useState('');
  const [sessionWeeks, setSessionWeeks] = useState<number | ''>('');

  const classQuery = useQuery({
    queryKey: ['portal', 'admin-class-detail', id],
    enabled: isSuper && Number.isFinite(id),
    queryFn: async () => {
      const [{ data: classRow, error: classError }, { data: clients, error: clientsError }, { data: courses, error: coursesError }] =
        await Promise.all([
          supabase
            .from('classes')
            .select('id, client_id, course_id, label, meeting_weekday, meeting_start, meeting_end, session_weeks')
            .eq('id', id)
            .maybeSingle(),
          supabase.from('clients').select('id, name').order('name'),
          supabase.from('courses').select('id, name').order('id'),
        ]);
      if (classError) throw classError;
      if (clientsError) throw clientsError;
      if (coursesError) throw coursesError;
      return {
        classRow: classRow as ClassRow | null,
        clients: (clients ?? []) as LookupRow[],
        courses: (courses ?? []) as LookupRow[],
      };
    },
  });

  const classRow = classQuery.data?.classRow;

  useEffect(() => {
    if (!classRow) return;
    setLabel(classRow.label ?? '');
    setClientId(classRow.client_id ?? '');
    setCourseId(classRow.course_id ?? '');
    setWeekday(classRow.meeting_weekday ?? '');
    setMeetingStart(toTimeInput(classRow.meeting_start));
    setMeetingEnd(toTimeInput(classRow.meeting_end));
    setSessionWeeks(classRow.session_weeks ?? '');
  }, [classRow]);

  const updateClass = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('classes')
        .update({
          label: label.trim() || null,
          client_id: clientId === '' ? null : clientId,
          course_id: courseId === '' ? null : courseId,
          meeting_weekday: weekday === '' ? null : weekday,
          meeting_start: meetingStart || null,
          meeting_end: meetingEnd || null,
          session_weeks: sessionWeeks === '' ? null : sessionWeeks,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['portal', 'admin-class-detail', id] }),
        qc.invalidateQueries({ queryKey: ['portal', 'teacher-classes'] }),
      ]);
    },
  });

  const deniedHeader = (
    <PortalHeaderProfile
      name={user?.email ?? 'User'}
      roleLabel={appUser && isHrAdminRole(appUser.role) ? 'Coordinator' : 'Student'}
    />
  );
  const adminFooter = (
    <PortalAccountFooter email={user?.email} roleLabel="Admin" onSignOut={() => void signOut().then(() => navigate('/login'))} />
  );
  const adminHeader = <PortalHeaderProfile name={user?.email ?? 'User'} roleLabel="Admin" />;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">Loading…</div>;
  }

  if (!appUser || !isStaffRole(appUser.role) || !isSuper) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} />}
        headerTitle="Class Details"
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
      headerTitle="Class Details"
      headerTrailing={adminHeader}
      mobileTabs={navTabs}
      mainClassName="portal-flush-stack"
    >
      <section className="portal-flush-section">
        <Link to="/admin" className="text-xs font-medium text-portal-muted underline-offset-4 hover:underline">
          Back to classes
        </Link>
        {classQuery.isPending ? (
          <p className="mt-3 text-sm text-portal-muted">Loading…</p>
        ) : classQuery.isError ? (
          <p className="mt-3 text-sm text-portal-danger">{(classQuery.error as Error).message}</p>
        ) : !classRow ? (
          <p className="mt-3 text-sm text-portal-muted">Class not found.</p>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-semibold text-portal-ink">{classRow.label ?? `Class #${classRow.id}`}</h2>
            <div className="mt-4 border border-portal-border p-3">
              <h3 className="text-sm font-semibold text-portal-ink">Edit class</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Label</span>
                  <input className={inputClass} value={label} onChange={(e) => setLabel(e.target.value)} />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Organization</span>
                  <select className={inputClass} value={clientId} onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select…</option>
                    {classQuery.data?.clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Course</span>
                  <select className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select…</option>
                    {classQuery.data?.courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Weekday</span>
                  <select className={inputClass} value={weekday} onChange={(e) => setWeekday(e.target.value ? Number(e.target.value) : '')}>
                    <option value="">Select…</option>
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                      <option key={day} value={index}>
                        {day}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Session weeks</span>
                  <input
                    className={inputClass}
                    type="number"
                    min="1"
                    value={sessionWeeks}
                    onChange={(e) => setSessionWeeks(e.target.value ? Number(e.target.value) : '')}
                  />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Start time</span>
                  <input className={inputClass} type="time" value={meetingStart} onChange={(e) => setMeetingStart(e.target.value)} />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">End time</span>
                  <input className={inputClass} type="time" value={meetingEnd} onChange={(e) => setMeetingEnd(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                disabled={updateClass.isPending}
                onClick={() => void updateClass.mutateAsync().catch(() => {})}
                className="mt-3 border border-portal-border bg-portal-surface px-3 py-1.5 text-sm font-medium text-portal-ink hover:bg-portal-bg disabled:opacity-50"
              >
                {updateClass.isPending ? 'Saving…' : 'Save class'}
              </button>
              {updateClass.isError ? <p className="mt-2 text-sm text-portal-danger">{(updateClass.error as Error).message}</p> : null}
              {updateClass.isSuccess ? <p className="mt-2 text-sm text-portal-muted">Class saved.</p> : null}
            </div>
          </>
        )}
      </section>
    </PortalShell>
  );
}
