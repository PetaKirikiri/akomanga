#!/usr/bin/env node
/**
 * afterShellExecution: after `git push`, inject smoke / workflow follow-up; optionally dispatch GH workflow.
 * Env: ECOSYSTEM_AKOMANGA_URL or AKOMANGA_URL; ECOSYSTEM_AUTO_GH_WORKFLOW=1 to run `gh workflow run`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const raw = fs.readFileSync(0, 'utf8');
let input = {};
try {
  input = JSON.parse(raw || '{}');
} catch {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const command = typeof input.command === 'string' ? input.command : '';
const output = typeof input.output === 'string' ? input.output : '';

if (!/\bgit\b[^\n]*\bpush\b/.test(command)) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const looksFailed =
  /\bfatal:\s/i.test(output) ||
  (/\berror:\s/i.test(output) && !/Everything up-to-date/i.test(output));

if (looksFailed && !/Everything up-to-date/i.test(output)) {
  process.stdout.write(JSON.stringify({}));
  process.exit(0);
}

const url =
  (process.env.ECOSYSTEM_AKOMANGA_URL || process.env.AKOMANGA_URL || '').trim().replace(/\/$/, '');

let ghNote = '';
if (process.env.ECOSYSTEM_AUTO_GH_WORKFLOW === '1' && url) {
  try {
    const root = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      cwd: process.cwd(),
    }).trim();
    execFileSync(
      'gh',
      ['workflow', 'run', 'ecosystem-smoke.yml', '-f', `akomanga_url=${url}`],
      { cwd: root, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
    );
    ghNote = `\nDispatched **Ecosystem smoke** via \`gh workflow run\` (**ECOSYSTEM_AUTO_GH_WORKFLOW=1**).\n`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ghNote = `\nAuto \`gh workflow run\` failed (${msg}). Use GitHub → Actions → **Ecosystem smoke**, or install/\`gh auth login\`.\n`;
  }
}

const smokeCmd = url
  ? `\`AKOMANGA_URL="${url}" npm run smoke:ecosystem\``
  : `\`AKOMANGA_URL=https://your-akomanga-host npm run smoke:ecosystem\``;

const ctx = `## git push — ecosystem checkpoint

${url ? `Smoke URL from env: **${url}**. ` : 'Add **ECOSYSTEM_AKOMANGA_URL** (or **AKOMANGA_URL**) to \`.env.local\` so hooks can suggest exact smoke commands and optional auto-dispatch.'}

1. Confirm the intended repo(s) were pushed: **akomanga**, **mata**, **maumahara**, and especially **panui/pānui** when shared chrome/navigation changed.
2. Allow **Vercel** to finish for every affected project before calling the upload done.
3. Manually check the shared product switcher on **Akomanga**, **Mata**, **Maumahara**, and **Pānui**: logo + current product name + dropdown.
4. Run stitched smoke from this repo: ${smokeCmd}
5. Or **GitHub → Actions → Ecosystem smoke → Run workflow** (\`workflow_dispatch\`).
${ghNote}
**Fast inner loop** remains **\`npm run dev:ecosystem\`** — see \`DEPLOY_DEBUG.md\`, \`ECOSYSTEM.md\`.`;

process.stdout.write(JSON.stringify({ additional_context: ctx }));
process.exit(0);
