# Akomanga Ecosystem Routing

Akomanga is the student-facing entry point. Mata and Maumahara remain separate apps, but production routing should make them feel like part of Akomanga.

## Production Paths

Configure the Akomanga domain with host-level rewrites:

- `/mata/*` -> Mata app
- `/maumahara/*` -> Maumahara app

Do this at the deployment layer rather than with iframes, so routing, auth redirects, browser history, and mobile behavior stay normal.

## Local Development

By default Akomanga generates same-origin links:

- `/mata/classroom?classId=...&lessonNumber=...`
- `/maumahara?classId=...&lessonNumber=...`

For local development, set app URL overrides in `.env`:

```bash
VITE_MATA_APP_URL=http://localhost:5176
VITE_MAUMAHARA_APP_URL=http://localhost:5175
```

All three apps must point at the same Supabase project so session/profile data is shared.
