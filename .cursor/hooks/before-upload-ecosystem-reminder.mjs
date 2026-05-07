#!/usr/bin/env node
/**
 * beforeShellExecution: remind agents that this is a four-product Vercel ecosystem.
 * The hook does not block; it injects context before upload/deploy commands.
 */
import fs from 'node:fs';

const raw = fs.readFileSync(0, 'utf8');
let input = {};
try {
  input = JSON.parse(raw || '{}');
} catch {
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
}

const command = typeof input.command === 'string' ? input.command : '';

if (!/\b(git\s+push|vercel\s+(deploy|--prod)|npx\s+vercel\s+(deploy|--prod)|npm\s+run\s+vercel:deploy)\b/i.test(command)) {
  process.stdout.write(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
}

const reminder = `Ecosystem upload reminder:
- This is not just Akomanga. Before calling upload/deploy done, ensure the relevant repo(s) are committed and pushed: akomanga, mata, maumahara, and panui/pānui.
- If a shared navigation/chrome change was made, verify every product shows the logo + product-name dropdown.
- Pānui is easy to miss because it is a separate repo and Vercel project. Check/push it explicitly.
- After deploys settle, run or request the stitched smoke check: AKOMANGA_URL=<production-url> npm run smoke:ecosystem.`;

process.stdout.write(
  JSON.stringify({
    permission: 'allow',
    agent_message: reminder,
    user_message: reminder,
  }),
);
process.exit(0);
