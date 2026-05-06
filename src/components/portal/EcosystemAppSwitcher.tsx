import { useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ecosystemProductDisplayLabel, ecosystemProductKey, isLikelyInAppWebView } from '@/lib/ecosystemBrand';
import { maumaharaUrl, mataAppRootUrl, purakauAppUrl } from '@/lib/mataLaunch';

export type EcosystemAppSwitcherProps = {
  /** Narrow sidebar: icon-only trigger; menu opens to the right of the rail. */
  compact?: boolean;
};

const SUMMARY_PILL =
  'inline-flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-portal-border bg-portal-surface px-3 py-1.5 text-sm font-semibold tracking-tight text-portal-ink shadow-sm hover:bg-portal-bg [&::-webkit-details-marker]:hidden';

const SUMMARY_COMPACT =
  'inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-portal-border bg-portal-surface text-portal-ink shadow-sm hover:bg-portal-bg [&::-webkit-details-marker]:hidden';

function menuClass(compact: boolean): string {
  return compact
    ? 'absolute left-full top-0 z-[120] ml-1.5 min-w-[12rem] rounded-lg border border-portal-border bg-portal-surface py-1 shadow-lg'
    : 'absolute right-0 top-full z-[120] mt-1.5 min-w-[12rem] rounded-lg border border-portal-border bg-portal-surface py-1 shadow-lg';
}

const ROW_CLASS =
  'block w-full px-3 py-2 text-left text-sm text-portal-ink hover:bg-portal-bg';

const ROW_CURRENT_CLASS = `${ROW_CLASS} cursor-default bg-portal-bg/80 font-semibold text-portal-ink`;

function isModifiedClick(e: React.MouseEvent): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

/** `/mata`, `/panui`, `/maumahara` load a different document on production — never client-route them here. */
function needsFullPageNavigation(pathname: string): boolean {
  return /^\/(mata|maumahara|panui)(\/|$)/.test(pathname);
}

export function EcosystemAppSwitcher({ compact = false }: EcosystemAppSwitcherProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  if (typeof navigator !== 'undefined' && isLikelyInAppWebView()) {
    return null;
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const items = [
    { key: 'akomanga' as const, label: 'Akomanga', href: `${origin}/` },
    { key: 'maumahara' as const, label: 'Maumahara', href: maumaharaUrl() },
    { key: 'panui' as const, label: 'Pānui', href: purakauAppUrl() },
    { key: 'mata' as const, label: 'Mata', href: mataAppRootUrl() },
  ];

  const current = ecosystemProductKey(pathname);
  const summaryLabel = ecosystemProductDisplayLabel(pathname);

  const follow = (href: string, e: React.MouseEvent) => {
    if (isModifiedClick(e)) return;
    e.preventDefault();
    detailsRef.current?.removeAttribute('open');

    let url: URL;
    try {
      url = new URL(href, window.location.origin);
    } catch {
      window.location.assign(href);
      return;
    }

    if (url.origin !== window.location.origin) {
      window.location.assign(href);
      return;
    }

    const path = `${url.pathname}${url.search}${url.hash}`;
    if (needsFullPageNavigation(url.pathname)) {
      window.location.assign(href);
      return;
    }

    navigate(path);
  };

  return (
    <details ref={detailsRef} className="relative shrink-0">
      {compact ? (
        <summary
          className={SUMMARY_COMPACT}
          aria-label={`Products: ${summaryLabel}`}
          aria-haspopup="menu"
          title="Switch product"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 opacity-90" aria-hidden>
            <rect x="4" y="4" width="7" height="7" rx="1.75" />
            <rect x="13" y="4" width="7" height="7" rx="1.75" />
            <rect x="4" y="13" width="7" height="7" rx="1.75" />
            <rect x="13" y="13" width="7" height="7" rx="1.75" />
          </svg>
        </summary>
      ) : (
        <summary className={SUMMARY_PILL} aria-label={`Products menu: ${summaryLabel}`} aria-haspopup="menu">
          <span className="max-w-[11rem] truncate">{summaryLabel}</span>
          <span className="text-portal-muted" aria-hidden>
            ▾
          </span>
        </summary>
      )}
      <ul className={menuClass(compact)} role="menu">
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key} role="none">
              {active ? (
                <span className={ROW_CURRENT_CLASS} aria-current="page" role="menuitem">
                  {item.label}
                  <span className="sr-only"> (current product)</span>
                </span>
              ) : (
                <a
                  role="menuitem"
                  href={item.href}
                  className={ROW_CLASS}
                  onClick={(e) => follow(item.href, e)}
                >
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
