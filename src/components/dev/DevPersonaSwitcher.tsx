import { useAuth } from '@/context/AuthContext';
import { type DevPersona, isDevPersonaSwitcherEnabled } from '@/lib/devPersona';

const OPTIONS: { value: DevPersona; label: string }[] = [
  { value: 'live', label: 'Live (session)' },
  { value: 'learner', label: 'Learner (UI)' },
  { value: 'hr_admin', label: 'HR admin (UI)' },
  { value: 'staff', label: 'Teacher (UI)' },
  { value: 'admin', label: 'Admin (UI)' },
];

function DevPersonaSwitcherForm() {
  const { devPersona, setDevPersona } = useAuth();

  return (
    <div
      className="fixed bottom-4 right-4 z-[100] rounded-lg border border-portal-border bg-portal-surface px-3 py-2 shadow-lg"
      aria-label="Development persona"
    >
      <label className="flex flex-col gap-1 text-xs text-portal-muted">
        <span className="font-medium text-portal-ink">Dev persona</span>
        <select
          className="rounded-md border border-portal-border bg-portal-bg px-2 py-1.5 text-sm text-portal-ink"
          value={devPersona}
          onChange={(e) => setDevPersona(e.target.value as DevPersona)}
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 max-w-[14rem] text-[10px] leading-snug text-portal-muted">
        UI only — Supabase still uses your real login. Use real HR/staff users to test RLS.
      </p>
    </div>
  );
}

/** Shown unless `VITE_DISABLE_DEV_PERSONA_SWITCHER=true`. */
export function DevPersonaDevTools() {
  if (!isDevPersonaSwitcherEnabled()) {
    return null;
  }
  return <DevPersonaSwitcherForm />;
}
