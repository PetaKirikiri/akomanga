import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { PortalCard } from '@/components/portal/PortalLayout';
import { HrPageShell } from '@/pages/hr/HrPageShell';

export default function HrDashboard() {
  const { clientId } = useAuth();

  return (
    <HrPageShell>
      <PortalCard className="p-6">
        <h1 className="text-lg font-semibold text-portal-ink">HR overview</h1>
        <p className="mt-2 text-sm text-portal-muted">
          Manage cohorts for organisation <span className="font-medium text-portal-ink">#{clientId}</span>: run classes,
          maintain your learner list, and review lesson completion.
        </p>
        <ul className="mt-6 flex flex-col gap-3 text-sm font-medium text-portal-accent">
          <li>
            <Link to="/hr/classes" className="underline underline-offset-4 hover:text-portal-accent-muted">
              Classes — book a class and enrol learners
            </Link>
          </li>
          <li>
            <Link to="/hr/students" className="underline underline-offset-4 hover:text-portal-accent-muted">
              Students — add people before enrolling them
            </Link>
          </li>
          <li>
            <Link to="/hr/progress" className="underline underline-offset-4 hover:text-portal-accent-muted">
              Progress — lesson completion by learner
            </Link>
          </li>
        </ul>
      </PortalCard>
    </HrPageShell>
  );
}
