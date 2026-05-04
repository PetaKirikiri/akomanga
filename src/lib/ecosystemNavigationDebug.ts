/**
 * Logs every ecosystem navigation attempt (Join class, Practice) so DevTools / sessionStorage show intent
 * even when the next document is wrong (proxy 502, shell swallows /mata, etc.).
 */
export function logEcosystemLinkClick(payload: {
  kind: 'mata-join-class' | 'maumahara-practice';
  href: string;
  classId?: number;
  lessonNumber?: number;
}) {
  if (typeof window === 'undefined') return;

  const rawMata = import.meta.env.VITE_MATA_APP_URL;
  const meta = {
    ...payload,
    pageOrigin: window.location.origin,
    dev: import.meta.env.DEV,
    mode: import.meta.env.MODE,
    viteMataAppUrlSet: Boolean(String(rawMata ?? '').trim()),
  };

  console.info('[akomanga] ecosystem link click → navigating to', meta.href, meta);

  try {
    sessionStorage.setItem(
      'akomanga.lastEcosystemLinkClick',
      JSON.stringify({ ...meta, ts: Date.now() }),
    );
  } catch {
    /* quota / private mode */
  }
}
