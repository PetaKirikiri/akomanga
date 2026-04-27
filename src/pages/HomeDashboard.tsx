import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PortalCard } from '@/components/portal/PortalLayout';

const linkClass =
  'text-sm font-medium text-portal-accent underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-portal-ring/25 rounded';

type HomeDashboardProps = {
  /** Signed in but `app_users` row not ready — stats stay placeholders. */
  accessPending?: boolean;
};

export default function HomeDashboard({ accessPending }: HomeDashboardProps) {
  const { user, appUser, studentId } = useAuth();
  const enrolled = studentId != null && !accessPending;

  const welcomeName =
    appUser?.display_name?.trim().split(/\s+/)[0] ??
    user?.email?.split('@')[0] ??
    'there';

  const courseSummary = enrolled
    ? { primary: '2', secondary: '3 lessons due this week', hint: 'Mock data' }
    : { primary: '0', secondary: 'No active courses yet', hint: 'Enroll to see progress here' };

  const vocabSummary = enrolled
    ? { primary: '48', secondary: '12 words due for review', hint: 'Mock data' }
    : { primary: '0', secondary: 'No vocabulary tracked yet', hint: 'Start from My Vocab' };

  const structureSummary = enrolled
    ? { primary: '8', secondary: '2 new patterns this week', hint: 'Mock data' }
    : { primary: '0', secondary: 'No patterns saved yet', hint: 'Build them in Sentence structures' };

  const activities = enrolled
    ? [
        { id: 'a1', text: 'Completed lesson 2 in Te Reo 101', when: '2h ago' },
        { id: 'a2', text: 'Added 5 vocab cards from last lesson', when: 'Yesterday' },
        { id: 'a3', text: 'Practiced pattern: “Kei te …”', when: 'Mon' },
      ]
    : [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-portal-ink">
          {accessPending ? 'Welcome' : `Welcome back, ${welcomeName}`}
        </h1>
        <p className="mt-1 text-sm text-portal-muted">
          {accessPending
            ? 'Your dashboard will fill in once your account is linked.'
            : enrolled
              ? "Here's a quick snapshot of your learning — details will hook up to real data later."
              : "You're set up. Enroll in a class to unlock course progress; vocab and structures are ready when you are."}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Overview">
        <PortalCard className="flex flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-portal-muted">Courses</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-portal-ink">
            {accessPending ? '—' : courseSummary.primary}
          </p>
          <p className="mt-1 text-sm text-portal-muted">
            {accessPending ? 'Waiting for access' : courseSummary.secondary}
          </p>
          <p className="mt-2 text-xs text-portal-muted/80">{courseSummary.hint}</p>
          <Link to="/student" className={`${linkClass} mt-auto pt-4`}>
            Open My courses →
          </Link>
        </PortalCard>

        <PortalCard className="flex flex-col p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-portal-muted">Vocabulary</p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-portal-ink">
            {accessPending ? '—' : vocabSummary.primary}
          </p>
          <p className="mt-1 text-sm text-portal-muted">
            {accessPending ? 'Waiting for access' : vocabSummary.secondary}
          </p>
          <p className="mt-2 text-xs text-portal-muted/80">{vocabSummary.hint}</p>
          <Link to="/vocab" className={`${linkClass} mt-auto pt-4`}>
            Open My Vocab →
          </Link>
        </PortalCard>

        <PortalCard className="flex flex-col p-5 sm:col-span-2 xl:col-span-1">
          <p className="text-xs font-medium uppercase tracking-wide text-portal-muted">
            Sentence structures
          </p>
          <p className="mt-3 text-3xl font-semibold tabular-nums text-portal-ink">
            {accessPending ? '—' : structureSummary.primary}
          </p>
          <p className="mt-1 text-sm text-portal-muted">
            {accessPending ? 'Waiting for access' : structureSummary.secondary}
          </p>
          <p className="mt-2 text-xs text-portal-muted/80">{structureSummary.hint}</p>
          <Link to="/sentence-structures" className={`${linkClass} mt-auto pt-4`}>
            Open Sentence structures →
          </Link>
        </PortalCard>
      </section>

      <PortalCard className="p-5">
        <h2 className="text-sm font-semibold text-portal-ink">Recent activity</h2>
        <p className="mt-0.5 text-xs text-portal-muted">Placeholder timeline — will sync with real events.</p>
        {activities.length === 0 ? (
          <p className="mt-6 text-sm text-portal-muted">No recent activity yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-portal-border">
            {activities.map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-sm text-portal-ink">{a.text}</span>
                <span className="shrink-0 text-xs text-portal-muted">{a.when}</span>
              </li>
            ))}
          </ul>
        )}
      </PortalCard>
    </div>
  );
}
