const DEFAULT_MATA_APP_PATH = '/mata';
const DEFAULT_MAUMAHARA_APP_PATH = '/maumahara';

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

export function mataClassroomUrl(classId: number, lessonNumber: number): string {
  const baseUrl = import.meta.env.VITE_MATA_APP_URL?.trim();
  return buildEcosystemUrl(baseUrl, `${DEFAULT_MATA_APP_PATH}/classroom`, { classId, lessonNumber });
}

export function maumaharaUrl(classId?: number, lessonNumber?: number): string {
  const baseUrl = import.meta.env.VITE_MAUMAHARA_APP_URL?.trim();
  const params =
    classId != null && lessonNumber != null
      ? { classId, lessonNumber }
      : undefined;
  return buildEcosystemUrl(baseUrl, DEFAULT_MAUMAHARA_APP_PATH, params);
}
