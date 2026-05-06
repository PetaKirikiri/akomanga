/** UI-only persona overlay for navigation; does not change Supabase JWT/RLS. */

export const DEV_PERSONA_STORAGE_KEY = 'akomanga_dev_persona';

export type DevPersona = 'live' | 'learner' | 'hr_admin' | 'staff' | 'admin';

export const DEV_DEFAULT_HR_CLIENT_ID = 1;

/** On by default (incl. production). Set `VITE_DISABLE_DEV_PERSONA_SWITCHER=true` to hide. UI-only vs RLS/JWT. */
export function isDevPersonaSwitcherEnabled(): boolean {
  return import.meta.env.VITE_DISABLE_DEV_PERSONA_SWITCHER !== 'true';
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
