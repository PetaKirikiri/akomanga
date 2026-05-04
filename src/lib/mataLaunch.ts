const DEFAULT_MATA_APP_PATH = '/mata';
const DEFAULT_MAUMAHARA_APP_PATH = '/maumahara';
const DEFAULT_PANUI_APP_PATH = '/panui';

/** In dev, `VITE_MATA_APP_URL=http://localhost:5176` uses `/classroom` on Mata when `base: '/'`. Never point this at the Akomanga dev origin (e.g. 5174) — that would request `/classroom` on the shell and bypass `/mata`. */
function isLocalhostLoopback(base: string | undefined): boolean {
  if (!base?.trim()) return false;
  try {
    const u = new URL(base.trim());
    return u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

/** True when `VITE_MATA_APP_URL` is another loopback origin (different port) — open `/classroom` on that server. */
function isRemoteLocalhostMataDev(base: string | undefined): boolean {
  if (!import.meta.env.DEV || !isLocalhostLoopback(base)) return false;
  if (typeof window === 'undefined') return true;
  try {
    return new URL(base!.trim()).origin !== window.location.origin;
  } catch {
    return false;
  }
}

function buildEcosystemUrl(base: string | undefined, path: string, params?: Record<string, number>): string {
  const trimmedBase = base?.trim();
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(path, trimmedBase || origin);

  if (!trimmedBase && path.startsWith('/')) {
    url.pathname = path;
  }

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, String(value));
  }

  return trimmedBase ? url.toString() : `${url.pathname}${url.search}`;
}

/** Same-origin `/mata` or dev Mata origin root — for navigating into the Mata app shell. */
export function mataAppRootUrl(): string {
  const raw = import.meta.env.VITE_MATA_APP_URL?.trim();
  let baseUrl = raw;
  if (import.meta.env.DEV && raw && typeof window !== 'undefined') {
    try {
      if (new URL(raw).origin === window.location.origin) {
        baseUrl = undefined;
      }
    } catch {
      baseUrl = undefined;
    }
  }
  const path = isRemoteLocalhostMataDev(raw) ? '/' : DEFAULT_MATA_APP_PATH;
  return buildEcosystemUrl(baseUrl, path);
}

export function mataClassroomUrl(classId: number, lessonNumber: number): string {
  const raw = import.meta.env.VITE_MATA_APP_URL?.trim();
  let baseUrl = raw;
  if (import.meta.env.DEV && raw && typeof window !== 'undefined') {
    try {
      if (new URL(raw).origin === window.location.origin) {
        baseUrl = undefined;
      }
    } catch {
      baseUrl = undefined;
    }
  }

  const path = isRemoteLocalhostMataDev(raw) ? '/classroom' : `${DEFAULT_MATA_APP_PATH}/classroom`;
  return buildEcosystemUrl(baseUrl, path, { classId, lessonNumber });
}

export function maumaharaUrl(classId?: number, lessonNumber?: number): string {
  const baseUrl = import.meta.env.VITE_MAUMAHARA_APP_URL?.trim();
  const params =
    classId != null && lessonNumber != null
      ? { classId, lessonNumber }
      : undefined;
  return buildEcosystemUrl(baseUrl, DEFAULT_MAUMAHARA_APP_PATH, params);
}

/**
 * Pūrākau / Pānui entry. Prefer same-origin `/panui` in production; set `VITE_PURAKAU_APP_URL` for a
 * separate domain (e.g. https://purakau.nz). `VITE_PANUI_APP_URL` wins for dev overrides.
 */
export function purakauAppUrl(subPath = ''): string {
  const panuiOverride = import.meta.env.VITE_PANUI_APP_URL?.trim();
  const purakauOverride = import.meta.env.VITE_PURAKAU_APP_URL?.trim();
  const extra = subPath.startsWith('/') ? subPath : subPath ? `/${subPath}` : '';

  if (purakauOverride && !panuiOverride) {
    const base = purakauOverride.replace(/\/+$/, '');
    return extra ? `${base}${extra}` : base;
  }

  const baseUrl = panuiOverride || undefined;
  return buildEcosystemUrl(baseUrl, `${DEFAULT_PANUI_APP_PATH}${extra}`);
}
