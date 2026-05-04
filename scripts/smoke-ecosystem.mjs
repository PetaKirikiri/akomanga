/**
 * Smoke check: Akomanga shell + stitched paths return HTML; module/link assets are not HTML (MIME / stitch regression).
 * Usage: AKOMANGA_URL=https://your-app.vercel.app node scripts/smoke-ecosystem.mjs
 */
const base = process.env.AKOMANGA_URL?.replace(/\/$/, '');
if (!base) {
  console.error('Set AKOMANGA_URL (e.g. https://akomanga-xxx.vercel.app)');
  process.exit(1);
}

const paths = ['/', '/mata/', '/maumahara/', '/panui/'];
let failed = false;

function absolutize(pageUrl, href) {
  try {
    return new URL(href, pageUrl).href;
  } catch {
    return null;
  }
}

for (const path of paths) {
  const url = `${base}${path === '/' ? '/' : path}`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ok = res.ok;
    console.log(`${ok ? 'OK' : 'FAIL'}\t${res.status}\t${url}`);
    if (!ok) {
      failed = true;
      continue;
    }
    const html = await res.text();
    const scriptHrefs = [...html.matchAll(/<script[^>]+src="([^"]+)"/gi)].map((m) => m[1]);
    const hrefs = [...new Set(scriptHrefs)].filter((h) => h.endsWith('.js') || h.includes('/assets/'));
    const sheetHrefs = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/gi)].map((m) => m[1]);

    for (const href of hrefs) {
      const assetUrl = absolutize(url, href);
      if (!assetUrl) continue;
      const ar = await fetch(assetUrl, { redirect: 'follow' });
      const ct = (ar.headers.get('content-type') || '').split(';')[0].trim();
      const isJs = ct.includes('javascript') || ct === 'text/javascript';
      if (!ar.ok || !isJs) {
        console.error(
          `FAIL\tasset\t${assetUrl}\tstatus=${ar.status}\tcontent-type=${ct || '(none)'}\texpected JS`,
        );
        failed = true;
      } else {
        console.log(`OK\tasset\t${ar.status}\t${ct}\t${assetUrl}`);
      }
    }
    for (const href of sheetHrefs) {
      const assetUrl = absolutize(url, href);
      if (!assetUrl) continue;
      const ar = await fetch(assetUrl, { redirect: 'follow' });
      const ct = (ar.headers.get('content-type') || '').split(';')[0].trim();
      const isCss = ct.includes('css');
      if (!ar.ok || !isCss) {
        console.error(
          `FAIL\tasset\t${assetUrl}\tstatus=${ar.status}\tcontent-type=${ct || '(none)'}\texpected CSS`,
        );
        failed = true;
      } else {
        console.log(`OK\tasset\t${ar.status}\t${ct}\t${assetUrl}`);
      }
    }
  } catch (err) {
    console.error(`FAIL\t-\t${url}\t${err instanceof Error ? err.message : err}`);
    failed = true;
  }
}

if (failed) {
  console.error(
    '\nFix: satellite vercel.json must use `{ handle: filesystem }` before SPA fallback so /mata/assets, /panui/assets, etc. are not rewritten to index.html. See mata/maumahara/pānui vercel.json.',
  );
  if (base.includes('127.0.0.1') || base.includes('localhost')) {
    console.error(
      'Local: 502 on /maumahara/ or /panui/ usually means those dev servers (default :5175, :5177) are not running.',
    );
  }
  process.exit(1);
}

console.log('\nPage + asset smoke passed. Auth + DB still need manual login checks.');
