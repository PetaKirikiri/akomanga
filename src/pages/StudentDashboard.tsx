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

type CourseRow = { id: number; name: string; description: string | null };

type ProgressSummary = {
  wordsLearned: number;
  sentenceStructuresLearned: number;
  enrolledCourses: number;
};

const trophyCards = [
  { title: 'Hot streak', detail: 'Practice 3 days in a row', status: 'Locked' },
  { title: 'Kupu collector', detail: 'Learn 25 words', status: 'In progress' },
  { title: 'Pattern builder', detail: 'Learn 5 sentence structures', status: 'Locked' },
  { title: 'Class ready', detail: 'Open notes before class', status: 'Unlocked' },
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, appUser, studentId, signOut, loading } = useAuth();
  const navTabs = portalNavForRole(appUser?.role, { adminIfStaff: true });
  const isStaffUser = Boolean(appUser && isStaffRole(appUser.role));
  const isHrUser = Boolean(appUser && isHrAdminRole(appUser.role));

  const footer = (
    <PortalAccountFooter
      email={user?.email}
      roleLabel={isStaffUser ? 'Teacher' : 'Student'}
      onSignOut={() => void signOut().then(() => navigate('/login'))}
    />
  );
  const headerTrailing = (
    <PortalHeaderProfile name={user?.email ?? 'User'} roleLabel={isStaffUser ? 'Teacher' : 'Student'} />
  );

  const coursesQuery = useQuery({
    queryKey: ['portal', 'student-courses', studentId],
    enabled: !isStaffUser && !isHrUser && studentId != null,
    queryFn: async (): Promise<CourseRow[]> => {
      const sid = studentId as number;
      const { data: ce, error: e1 } = await supabase.from('class_enrollments').select('class_id').eq('student_id', sid);
      if (e1) throw e1;
      const classIds = [...new Set((ce ?? []).map((r) => r.class_id as number))];
      if (classIds.length === 0) return [];
      const { data: cl, error: e2 } = await supabase.from('classes').select('course_id').in('id', classIds);
      if (e2) throw e2;
      const courseIds = [
        ...new Set((cl ?? []).map((r) => r.course_id as number | null).filter((x): x is number => x != null)),
      ];
      if (courseIds.length === 0) return [];
      const { data: courses, error: e3 } = await supabase
        .from('courses')
        .select('id, name, description')
        .in('id', courseIds);
      if (e3) throw e3;
      return (courses ?? []) as CourseRow[];
    },
  });

  const progressSummaryQuery = useQuery({
    queryKey: ['portal', 'student-progress-summary', studentId, coursesQuery.data],
    enabled: !isStaffUser && !isHrUser && studentId != null && !coursesQuery.isPending,
    queryFn: async (): Promise<ProgressSummary> => {
      const courseIds = (coursesQuery.data ?? []).map((course) => course.id);
      const [{ count: wordCount, error: wordError }, { count: patternCount, error: patternError }] =
        await Promise.all([
          courseIds.length > 0
            ? supabase
                .from('course_words')
                .select('id', { count: 'exact', head: true })
                .in('course_id', courseIds)
            : Promise.resolve({ count: 0, error: null }),
          supabase
            .from('sentence_patterns')
            .select('id', { count: 'exact', head: true }),
        ]);
      if (wordError) throw wordError;
      if (patternError) throw patternError;
      return {
        wordsLearned: wordCount ?? 0,
        sentenceStructuresLearned: patternCount ?? 0,
        enrolledCourses: courseIds.length,
      };
    },
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-portal-bg text-portal-muted">
        Loading…
      </div>
    );
  }

  if (isHrUser) {
    return <Navigate to="/hr" replace />;
  }

  if (isStaffUser) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
        headerTitle="Teacher Dashboard"
        headerTrailing={headerTrailing}
        mobileTabs={navTabs}
        mainClassName="mx-auto w-full max-w-3xl flex-1 px-6 py-8"
      >
        <PortalCard className="p-6">
          <p className="text-sm text-portal-muted">Staff accounts use the admin area.</p>
          <button
            type="button"
            onClick={() => navigate('/admin')}
            className="mt-4 rounded-lg bg-portal-accent px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-portal-accent-muted focus:outline-none focus:ring-2 focus:ring-portal-ring/40"
          >
            Go to admin
          </button>
        </PortalCard>
      </PortalShell>
    );
  }

  if (studentId == null) {
    return (
      <PortalShell
        sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
        headerTitle="Progress"
        headerTrailing={headerTrailing}
        mobileTabs={navTabs}
        mainClassName="w-full flex-1 px-0 py-0"
      >
        <div className="min-h-full bg-portal-surface p-4 sm:p-6">
          <p className="text-sm text-portal-muted">No student profile linked to this account.</p>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell
      sidebar={<PortalSidebar tabs={navTabs} footer={footer} />}
      headerTitle="Progress"
      headerTrailing={headerTrailing}
      mobileTabs={navTabs}
      mainClassName="w-full flex-1 px-0 py-0"
    >
      <div className="min-h-full bg-portal-surface p-4 sm:p-6">
        {coursesQuery.isPending ? (
          <p className="text-sm text-portal-muted">Loading courses...</p>
        ) : coursesQuery.isError ? (
          <p className="text-sm text-portal-danger">{(coursesQuery.error as Error).message}</p>
        ) : (
          <StudentProgressOverview
            summary={progressSummaryQuery.data ?? null}
            isPending={progressSummaryQuery.isPending}
            errorMessage={progressSummaryQuery.isError ? (progressSummaryQuery.error as Error).message : null}
          />
        )}
      </div>
    </PortalShell>
  );
}

function StudentProgressOverview({
  summary,
  isPending,
  errorMessage,
}: {
  summary: ProgressSummary | null;
  isPending: boolean;
  errorMessage: string | null;
}) {
  return (
    <div className="space-y-6">
      {errorMessage ? <p className="text-sm text-portal-danger">{errorMessage}</p> : null}
      <section className="grid gap-3 sm:grid-cols-3" aria-label="Learning summary">
        <ProgressMetricCard label="Words learned" value={isPending ? '...' : String(summary?.wordsLearned ?? 0)} />
        <ProgressMetricCard
          label="Sentence structures"
          value={isPending ? '...' : String(summary?.sentenceStructuresLearned ?? 0)}
        />
        <ProgressMetricCard label="Classes joined" value={isPending ? '...' : String(summary?.enrolledCourses ?? 0)} />
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-portal-muted">Trophies</h2>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {trophyCards.map((trophy) => (
            <li key={trophy.title} className="rounded-xl border border-portal-border bg-portal-bg/40 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-portal-accent/15 text-sm font-semibold text-portal-accent">
                {trophy.title.charAt(0)}
              </div>
              <p className="mt-3 text-sm font-semibold text-portal-ink">{trophy.title}</p>
              <p className="mt-1 text-xs text-portal-muted">{trophy.detail}</p>
              <p className="mt-3 text-xs font-medium text-portal-muted">{trophy.status}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ProgressMetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-portal-border bg-portal-bg/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-portal-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-portal-ink">{value}</p>
    </div>
  );
}
