export type EcosystemProductKey = 'akomanga' | 'maumahara' | 'panui' | 'mata';

/** Which mounted product the path belongs to (for chrome + switcher). */
export function ecosystemProductKey(pathname: string): EcosystemProductKey {
  const p = pathname;
  if (p.startsWith('/mata')) return 'mata';
  if (p.startsWith('/maumahara')) return 'maumahara';
  if (p.startsWith('/panui')) return 'panui';
  return 'akomanga';
}

/** Visible shell product from the browser path (portal SPA or diagnostic routes). */
export function ecosystemProductTitle(pathname: string): string {
  const p = pathname;
  if (p.startsWith('/mata')) return 'mata';
  if (p.startsWith('/maumahara')) return 'maumahara';
  if (p.startsWith('/panui')) return 'pānui';
  return 'akomanga';
}

/** Display casing for chrome labels / switcher trigger. */
export function ecosystemProductDisplayLabel(pathname: string): string {
  const t = ecosystemProductTitle(pathname);
  if (t === 'pānui') return 'Pānui';
  if (t === 'maumahara') return 'Maumahara';
  if (t === 'mata') return 'Mata';
  return 'Akomanga';
}

/** Hide ecosystem extras (floating switcher) in embedded browsers — not a perfect signal. */
export function isLikelyInAppWebView(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/\bwv\b/i.test(ua)) return true;
  if (/Electron\//i.test(ua)) return true;
  return false;
}
