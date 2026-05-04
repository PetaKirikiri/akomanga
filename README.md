# Akomanga

Student-facing shell for the learning ecosystem: **Vite**, **React 19**, **Tailwind CSS v4**, **TanStack Query**, **Supabase**, **Zod**, **Drizzle ORM** (kit + `postgres`). Mata, Maumahara, and optional Pānui mount under the same hostname in production (see [ECOSYSTEM.md](ECOSYSTEM.md)).

## Setup

```bash
cd akomanga
npm install
cp .env.example .env
# Fill VITE_SUPABASE_* and any other keys your team uses.
npm run dev
```

Dev server: [http://localhost:5174](http://localhost:5174) (port 5174 leaves 5173 free for other local apps).

## Environment

- [`.env.example`](.env.example) lists all variables; never commit `.env`.
- Use the **same Supabase project** as sibling apps (Mata, Maumahara, Pūrākau) so login and RLS stay consistent.

## Vercel

**If you only see Mata / Pānui (or “Pūrākau”) in the dashboard:** each app is a **separate** Git repo and **separate** Vercel project. This `akomanga` repo does not create a project by itself — you still need to **add** it once.

### Create the Akomanga project (dashboard)

1. [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**.
2. **Import** the **`akomanga`** Git repository (the shell — not `mata` / `panui`).
3. Framework: **Vite** (or leave auto-detect). Root directory: **`.`** (default). Build: `npm run build`, output: **`dist`** (already set in [`vercel.json`](vercel.json)).
4. Add **Production** environment variables before the first deploy if you need auth and satellites working immediately (see below), or deploy once and add them in **Settings → Environment Variables**, then redeploy.
5. **Deploy**.

### Create / link from the CLI (optional)

```bash
cd akomanga
npm install
npx vercel login
npx vercel link    # create new project or link existing
npx vercel --prod
```

### After the project exists

1. On the **Akomanga** project, set **Production** (and Preview if needed) env vars from `.env.example`, including:
   - `MATA_DEPLOYMENT_ORIGIN`
   - `MAUMAHARA_DEPLOYMENT_ORIGIN`
   - `PANUI_DEPLOYMENT_ORIGIN` (required for `/panui` in [`vercel.json`](vercel.json))
3. Configure **Supabase Auth** redirect allowlist for your Akomanga URL (see [ECOSYSTEM.md](ECOSYSTEM.md) deployment checklist).
4. Attach your **canonical domain** to this project. Satellites stay on their own `*.vercel.app` projects; learners use one Akomanga URL.

**Smoke check (after all four projects deploy):**

```bash
AKOMANGA_URL=https://your-deployment.vercel.app npm run smoke:ecosystem
```

This checks HTTP 200 on `/`, `/mata/`, `/maumahara/`, `/panui/` and confirms each page’s main JS/CSS responses are not `text/html` (catches broken Vercel SPA rewrites / stitching).

Details: [ECOSYSTEM.md](ECOSYSTEM.md).

## Drizzle

```bash
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate    # or db:push for prototyping
```

## Build

```bash
npm run build
npm run preview       # local smoke test of dist/
```
