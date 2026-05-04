import { Link, useLocation } from 'react-router-dom';
import { PortalCard } from '@/components/portal/PortalLayout';

const shell = 'min-h-screen bg-portal-bg px-4 py-10 text-portal-ink';

/** Shown when the URL is /mata, /maumahara, or /panui but the browser loaded Akomanga’s SPA (host did not proxy to the satellite). */
export default function EcosystemMountDiagnostic({ mount }: { mount: 'mata' | 'maumahara' | 'panui' }) {
  const loc = useLocation();
  const fullUrl = `${window.location.origin}${loc.pathname}${loc.search}`;
  const envKey =
    mount === 'mata'
      ? 'MATA_DEPLOYMENT_ORIGIN'
      : mount === 'maumahara'
        ? 'MAUMAHARA_DEPLOYMENT_ORIGIN'
        : 'PANUI_DEPLOYMENT_ORIGIN';

  console.warn('[akomanga] ecosystem path served by shell SPA — proxy/deploy misconfiguration', {
    mount,
    pathname: loc.pathname,
    search: loc.search,
    fullUrl,
    dev: import.meta.env.DEV,
  });

  return (
    <div className={shell}>
      <div className="mx-auto max-w-lg space-y-4">
        <PortalCard className="space-y-3 p-6">
          <h1 className="text-lg font-semibold">This page should open {mount}, not the portal shell</h1>
          <p className="text-sm text-portal-muted">
            Your address bar shows an ecosystem path, but Akomanga’s app loaded instead. That is almost always a{' '}
            <strong className="text-portal-ink">host / proxy</strong> issue, not CORS, Git, or API keys. The server must forward{' '}
            <code className="text-xs">/{mount}</code> to the {mount} deployment before serving this single-page app.
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-portal-muted">
            <li>
              <strong className="text-portal-ink">Production (Vercel):</strong> on the Akomanga project set{' '}
              <code className="text-xs">{envKey}</code> and ensure <code className="text-xs">vercel.json</code> routes <code className="text-xs">/{mount}</code>{' '}
              to that origin. See <code className="text-xs">ECOSYSTEM.md</code>.
            </li>
            <li>
              <strong className="text-portal-ink">Local dev:</strong> run <code className="text-xs">npm run dev:with-mata</code> from this repo, or from the{' '}
              {mount} app run <code className="text-xs">npm run dev:shell</code> (Mata) / set <code className="text-xs">VITE_APP_BASE=/{mount}/</code> so the
              satellite’s HTML requests <code className="text-xs">/{mount}/src/...</code>. If the satellite uses root{' '}
              <code className="text-xs">/src/main.tsx</code> while the address bar is still the shell (:5174), the browser loads the <strong className="text-portal-ink">portal</strong>{' '}
              bundle and you see this screen even when the proxy works.
            </li>
          </ul>
          <p className="text-xs text-portal-muted break-all">
            URL: {fullUrl}
          </p>
          <p className="text-xs text-portal-muted">
            DevTools → Console: filter for <code className="text-[10px]">[akomanga]</code> to see link clicks and this warning.{' '}
            <code className="text-[10px]">sessionStorage akomanga.lastEcosystemLinkClick</code> stores the last Join class / Practice click.
          </p>
          <div className="flex flex-wrap gap-3 pt-2 text-sm font-medium">
            <Link to="/vocab" className="text-portal-accent underline underline-offset-4">
              Back to Course
            </Link>
            <Link to="/home" className="text-portal-accent underline underline-offset-4">
              Home
            </Link>
          </div>
        </PortalCard>
      </div>
    </div>
  );
}
