/** Dev-only UI persona overlay; does not change Supabase JWT/RLS. */

export const DEV_PERSONA_STORAGE_KEY = 'akomanga_dev_persona';

export type DevPersona = 'live' | 'learner' | 'hr_admin' | 'staff' | 'admin';

export const DEV_DEFAULT_HR_CLIENT_ID = 1;

/** True during `npm run dev` only — no env file needed. Production builds never enable this. */
export function isDevPersonaSwitcherEnabled(): boolean {
  return import.meta.env.DEV;
}

export function readStoredDevPersona(): DevPersona {
  if (typeof sessionStorage === 'undefined') return 'live';
  const v = sessionStorage.getItem(DEV_PERSONA_STORAGE_KEY);
  if (v === 'live' || v === 'learner' || v === 'hr_admin' || v === 'staff' || v === 'admin') return v;
  return 'live';
}

export function persistDevPersona(persona: DevPersona): void {
  if (typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(DEV_PERSONA_STORAGE_KEY, persona);
}
