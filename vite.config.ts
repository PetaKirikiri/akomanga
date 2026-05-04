import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Socket } from 'node:net';
import httpProxy from 'http-proxy';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv, type Plugin } from 'vite';

function trimTarget(url: string | undefined, fallback: string): string {
  return (url?.trim() || fallback).replace(/\/+$/, '');
}

function ecosystemDevProxyPlugin(mataTarget: string, maumaharaTarget: string, panuiTarget: string): Plugin {
  const proxy = httpProxy.createProxyServer({ ws: true, changeOrigin: true });

  proxy.on('error', (err, _req, res) => {
    const raw = err instanceof Error ? err.message : String(err);
    const detail = raw.trim() || 'nothing is listening on the target port (start the sibling dev server first)';
    const body = `[akomanga dev proxy] cannot reach upstream — ${detail}. Start Mata (etc.) and use VITE_APP_BASE=/mata/ on the satellite.`;
    console.error(body, err);
    const out = res as Partial<ServerResponse> | undefined;
    if (out?.writeHead && !out.headersSent) {
      out.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      out.end?.(body);
    }
  });

  function targetForUrl(url: string): string | null {
    if (url.startsWith('/mata')) return mataTarget;
    if (url.startsWith('/maumahara')) return maumaharaTarget;
    if (url.startsWith('/panui')) return panuiTarget;
    return null;
  }

  return {
    name: 'ecosystem-dev-proxy',
    enforce: 'pre',
    configureServer(server) {
      if (server.config.command !== 'serve') return;

      const ecosystemProxy = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
        const url = req.url ?? '';
        const target = targetForUrl(url);
        if (!target) return next();
        proxy.web(req, res, { target }, (err) => {
          if (err && !res.headersSent) {
            res.statusCode = 502;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end(
              `[akomanga dev proxy] ${err instanceof Error ? err.message : String(err)} — start the satellite dev server (e.g. Mata :5176) with matching VITE_APP_BASE.`,
            );
          }
        });
      };

      server.middlewares.use(ecosystemProxy);
      const stack = server.middlewares.stack as { handle: unknown }[];
      const idx = stack.findIndex((layer) => layer.handle === ecosystemProxy);
      if (idx > 0) {
        stack.unshift(stack.splice(idx, 1)[0]!);
      }

      return () => {
        server.httpServer?.on('upgrade', (req, socket, head) => {
          const url = req.url ?? '';
          const target = targetForUrl(url);
          if (!target) return;
          proxy.ws(req, socket as Socket, head, { target });
        });
      };
    },
  };
}

/**
 * Dev-only: same-origin `/mata`, `/maumahara`, `/panui`.
 * `server.proxy` runs after Vite’s SPA HTML fallback, so `/mata/*` never reached Mata — we use `enforce: 'pre'` + `http-proxy` instead.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const mataTarget = trimTarget(env.MATA_DEV_PROXY_TARGET, 'http://localhost:5176');
  const maumaharaTarget = trimTarget(env.MAUMAHARA_DEV_PROXY_TARGET, 'http://localhost:5175');
  const panuiTarget = trimTarget(env.PANUI_DEV_PROXY_TARGET, 'http://localhost:5177');

  return {
    plugins: [ecosystemDevProxyPlugin(mataTarget, maumaharaTarget, panuiTarget), react(), tailwindcss()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js', 'zod', '@tanstack/react-query'],
    },
    server: {
      port: 5174,
    },
  };
});
