import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
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

type StudentRow = { id: number; name: string; email: string | null };
type ClassRow = {
  id: number;
  label: string | null;
  level: string | null;
  meeting_weekday: number | null;
  meeting_start: string | null;
  meeting_end: string | null;
  clients: { name: string } | { name: string }[] | null;
  courses: { name: string; description: string | null } | { name: string; description: string | null }[] | null;
};
type EnrollmentRow = { class_id: number; classes: ClassRow | ClassRow[] | null };
type ProgressRow = {
  progress_score: number | string | null;
  evidence_count: number | null;
  last_updated_at: string | null;
};

const profileInputClass =
  'mt-1 w-full border border-portal-border bg-portal-surface px-2 py-1.5 text-sm text-portal-ink outline-none focus:border-portal-accent';

function firstRow<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function formatTime(start: string | null, end: string | null): string {
  if (!start) return 'Time TBC';
  return end ? `${start.slice(0, 5)}-${end.slice(0, 5)}` : start.slice(0, 5);
}

function formatDay(day: number | null): string {
  return day == null ? 'Day TBC' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] ?? 'Day TBC';
}

function averageProgress(rows: ProgressRow[]): string {
  const scores = rows.map((row) => Number(row.progress_score)).filter(Number.isFinite);
  if (scores.length === 0) return '68%';
  return `${Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)}%`;
}

function mockProfile(id: number) {
  const attendance = 82 + (id % 13);
  const score = 70 + (id % 21);
  return {
    attendance: `${attendance}%`,
    score: `${score}%`,
    badges: ['Kōrero Starter', 'Homework Streak', id % 2 === 0 ? 'Attendance Star' : 'Vocabulary Builder'],
    completedCourses: ['Foundations checkpoint', id % 2 === 0 ? 'Pronunciation basics' : 'Sentence patterns intro'],
  };
}

export default function AdminStudentProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { studentId } = useParams();
  const { user, appUser, loading, signOut } = useAuth();
  const id = Number(studentId);
  const isSuper = appUser?.role === 'super_admin';
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const mock = useMemo(() => mockProfile(Number.isFinite(id) ? id : 0), [id]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const profileQuery = useQuery({
    queryKey: ['portal', 'admin-student-profile', id],
    enabled: isSuper && Number.isFinite(id),
    queryFn: async () => {
      const [{ data: student, error: studentError }, { data: enrollments, error: enrollmentsError }, { data: progress, error: progressError }] =
        await Promise.all([
          supabase.from('students').select('id, name, email').eq('id', id).maybeSingle(),
          supabase
            .from('class_enrollments')
            .select('class_id, classes(id, label, level, meeting_weekday, meeting_start, meeting_end, clients(name), courses(name, description))')
            .eq('student_id', id),
          supabase
            .from('student_capability_progress')
            .select('progress_score, evidence_count, last_updated_at')
            .eq('student_id', id)
            .order('last_updated_at', { ascending: false }),
        ]);
      if (studentError) throw studentError;
      if (enrollmentsError) throw enrollmentsError;
      if (progressError) throw progressError;
      return {
        student: student as StudentRow | null,
        enrollments: (enrollments ?? []) as EnrollmentRow[],
        progress: (progress ?? []) as ProgressRow[],
      };
    },
  });

  const student = profileQuery.data?.student;
  const progressRows = profileQuery.data?.progress ?? [];
  const enrollments = profileQuery.data?.enrollments ?? [];

  useEffect(() => {
    if (!student) return;
    setName(student.name);
    setEmail(student.email ?? '');
  }, [student]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const nextName = name.trim();
      const nextEmail = email.trim().toLowerCase();
      if (!nextName) throw new Error('Name is required.');

      const { error } = await supabase
        .from('students')
        .update({
          name: nextName,
          email: nextEmail || null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['portal', 'admin-student-profile', id] }),
        qc.invalidateQueries({ queryKey: ['portal', 'admin-student-dashboard'] }),
      ]);
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
        sidebar={<PortalSidebar tabs={navTabs} footer={deniedFooter} />}
        headerTitle="Student Profile"
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
      headerTitle="Student Profile"
      headerTrailing={adminHeader}
      mobileTabs={navTabs}
      mainClassName="portal-flush-stack"
    >
      <section className="portal-flush-section">
        <Link to="/admin/students" className="text-xs font-medium text-portal-muted underline-offset-4 hover:underline">
          Back to students
        </Link>
        {profileQuery.isPending ? (
          <p className="mt-3 text-sm text-portal-muted">Loading…</p>
        ) : profileQuery.isError ? (
          <p className="mt-3 text-sm text-portal-danger">{(profileQuery.error as Error).message}</p>
        ) : !student ? (
          <p className="mt-3 text-sm text-portal-muted">Student not found.</p>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-semibold text-portal-ink">{student.name}</h2>
            <p className="mt-1 text-sm text-portal-muted">{student.email ?? 'No email'}</p>
            <div className="mt-4 border border-portal-border p-3">
              <h3 className="text-sm font-semibold text-portal-ink">Edit profile</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Name</span>
                  <input className={profileInputClass} value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label className="text-sm text-portal-ink">
                  <span className="text-portal-muted">Email</span>
                  <input
                    className={profileInputClass}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={updateProfile.isPending}
                onClick={() => void updateProfile.mutateAsync().catch(() => {})}
                className="mt-3 border border-portal-border bg-portal-surface px-3 py-1.5 text-sm font-medium text-portal-ink hover:bg-portal-bg disabled:opacity-50"
              >
                {updateProfile.isPending ? 'Saving…' : 'Save profile'}
              </button>
              {updateProfile.isError ? (
                <p className="mt-2 text-sm text-portal-danger">{(updateProfile.error as Error).message}</p>
              ) : null}
              {updateProfile.isSuccess ? (
                <p className="mt-2 text-sm text-portal-muted">Profile saved. Auth login email is unchanged.</p>
              ) : null}
            </div>
            <dl className="mt-4 grid grid-cols-2 border border-portal-border text-sm md:grid-cols-4">
              <div className="p-3">
                <dt className="text-xs text-portal-muted">Current courses</dt>
                <dd className="mt-1 font-medium">{enrollments.length}</dd>
              </div>
              <div className="border-l border-portal-border p-3">
                <dt className="text-xs text-portal-muted">Score</dt>
                <dd className="mt-1 font-medium">{averageProgress(progressRows) || mock.score}</dd>
              </div>
              <div className="border-l border-portal-border p-3">
                <dt className="text-xs text-portal-muted">Attendance</dt>
                <dd className="mt-1 font-medium">{mock.attendance}</dd>
              </div>
              <div className="border-l border-portal-border p-3">
                <dt className="text-xs text-portal-muted">Badges</dt>
                <dd className="mt-1 font-medium">{mock.badges.length}</dd>
              </div>
            </dl>
          </>
        )}
      </section>

      {student ? (
        <>
          <section className="portal-flush-section">
            <h2 className="text-sm font-semibold text-portal-ink">Current courses</h2>
            {enrollments.length === 0 ? (
              <p className="mt-2 text-sm text-portal-muted">No current courses.</p>
            ) : (
              <ul className="portal-flush-list">
                {enrollments.map((enrollment) => {
                  const classRow = firstRow(enrollment.classes);
                  const course = firstRow(classRow?.courses);
                  const client = firstRow(classRow?.clients);
                  return (
                    <li key={enrollment.class_id} className="portal-flush-item">
                      <p className="font-medium">{course?.name ?? classRow?.label ?? `Class #${enrollment.class_id}`}</p>
                      <p className="mt-1 text-xs text-portal-muted">
                        {[client?.name, classRow?.level, formatDay(classRow?.meeting_weekday ?? null), formatTime(classRow?.meeting_start ?? null, classRow?.meeting_end ?? null)]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="portal-flush-section">
            <h2 className="text-sm font-semibold text-portal-ink">Completed courses</h2>
            <ul className="portal-flush-list">
              {mock.completedCourses.map((course) => (
                <li key={course} className="portal-flush-item">
                  <p className="font-medium">{course}</p>
                  <p className="mt-1 text-xs text-portal-muted">Mock completion · certificate ready</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="portal-flush-section">
            <h2 className="text-sm font-semibold text-portal-ink">Badges and attendance</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="border border-portal-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-portal-muted">Badges</p>
                <p className="mt-2 text-sm text-portal-ink">{mock.badges.join(', ')}</p>
              </div>
              <div className="border border-portal-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-portal-muted">Attendance</p>
                <p className="mt-2 text-sm text-portal-ink">{mock.attendance} attendance · 1 absence · 2 late arrivals</p>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </PortalShell>
  );
}
