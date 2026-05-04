#!/usr/bin/env bash
# Injects env/API-key autonomy policy at composer session start (see hooks.json).
cat >/dev/null

if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '{"additional_context":""}'
  exit 0
fi

node <<'NODE'
const text = `## Env and API keys — autonomous setup

Do **not** ask the user to manually confirm whether .env, Supabase keys, or API keys are “set up” unless they must type a secret (OAuth, device passcode, etc.).

- **You fix configuration:** read \`.env.example\`, \`ECOSYSTEM.md\`, and Vercel/Supabase-related docs in-repo. Create or edit \`.env\`, \`.env.local\`, or Vite env as required.
- **Consistent keys across ~/Coding:** if a value is missing in this repo, **copy** it from a sibling project under \`/Users/petakirikiri/Coding\` (e.g. mata, maumahara, panui, Pūrākau) using Read/grep/cp — same variable names (\`VITE_SUPABASE_URL\`, \`VITE_SUPABASE_ANON_KEY\`, etc.). Never paste secrets into the chat.
- **Prefer:** \`vercel env pull\`, Supabase CLI, or mirroring from a neighbor repo’s \`.env\` / \`.env.local\` when present.

## Vercel ↔ Git (full detail: \`.cursor/rules/vercel-git-sync.mdc\`)

When work touches **deployments**, **Git-linked Preview/Production**, **\`vercel.json\`**, **repo linking**, or ecosystem **\`*_DEPLOYMENT_ORIGIN\`** vars: run non-interactive checks yourself (\`git status\`, \`vercel ls\`, \`vercel inspect\`, \`vercel env pull\` as needed). Skip extra Vercel CLI on every trivial edit if Git integration is already healthy. OAuth/browser-only steps still require the user.`;

process.stdout.write(JSON.stringify({ additional_context: text, continue: true }));
NODE
