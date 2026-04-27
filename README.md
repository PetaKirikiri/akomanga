# akomanga

Web app scaffold matching **SubtitleDisplay** stack: **Vite**, **React 19**, **Tailwind CSS v4**, **TanStack Query**, **Supabase JS**, **Zod**, **Drizzle ORM** (kit + `postgres`), **OpenAI** env.

## Setup

```bash
cd akomanga
npm install
npm run dev
```

Open [http://localhost:5174](http://localhost:5174). The home page probes Supabase (`episodes` limit 1) and confirms an OpenAI key is loaded from env (browser apps should call OpenAI from a server or Vite plugin to avoid CORS).

## Environment

- `.env` was copied from **SubtitleDisplay** when this project was created (if that file existed).
- `.env.example` lists all variables; add **`DATABASE_URL`** for Drizzle migrations.
- Never commit `.env`.

## Drizzle

```bash
npm run db:generate   # after editing src/db/schema.ts
npm run db:migrate    # or db:push for prototyping
```

## Ports

Vite dev server defaults to **5174** so it can run next to SubtitleDisplay on 5173.
