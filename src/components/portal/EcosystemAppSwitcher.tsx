import { useLocation } from 'react-router-dom';
import { ecosystemProductDisplayLabel, isLikelyInAppWebView } from '@/lib/ecosystemBrand';
import { maumaharaUrl, mataAppRootUrl, purakauAppUrl } from '@/lib/mataLaunch';

/** Top-right pill opens same-origin / env-aware jumps between ecosystem SPAs. */
export function EcosystemAppSwitcher() {
  const { pathname } = useLocation();

  if (typeof navigator !== 'undefined' && isLikelyInAppWebView()) {
    return null;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const items = [
    { key: 'akomanga', text: 'Akomanga', href: `${origin}/` },
    { key: 'maumahara', text: 'Maumahara', href: maumaharaUrl() },
    { key: 'panui', text: 'Pānui', href: purakauAppUrl() },
    { key: 'mata', text: 'Mata', href: mataAppRootUrl() },
  ];

  const label = ecosystemProductDisplayLabel(pathname);

  return (
    <details className="relative shrink-0">
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg border border-portal-border bg-portal-surface px-3 py-1.5 text-sm font-medium text-portal-ink shadow-sm hover:bg-portal-bg [&::-webkit-details-marker]:hidden"
        aria-label="Switch ecosystem app"
      >
        <span>{label}</span>
        <span className="text-portal-muted" aria-hidden>
          ▾
        </span>
      </summary>
      <ul className="absolute right-0 top-full z-[100] mt-1 min-w-[12rem] rounded-lg border border-portal-border bg-portal-surface py-1 shadow-md">
        {items.map((item) => (
          <li key={item.key}>
            <a href={item.href} className="block px-3 py-2 text-sm text-portal-ink hover:bg-portal-bg">
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
