# Ecosystem chrome (Akomanga + satellites)

One learner-facing **hostname** (Akomanga on Vercel) proxies **Mata**, **Maumahara**, and **Pānui** under `/mata`, `/maumahara`, and `/panui` ([`ECOSYSTEM.md`](../ECOSYSTEM.md)).

## Shared product switcher

All shell UIs should expose the same **four-way product control**: **Akomanga** (portal shell), **Maumahara**, **Pānui**, **Mata**.

- **Implementation in this repo:** [`EcosystemAppSwitcher`](../src/components/portal/EcosystemAppSwitcher.tsx) — `<details>` menu, same-origin navigation where possible, full page load for mounted SPAs.
- **Primary (production) presentation:** `variant="sidebarBrand"` — **logo** + **current product name** (from the URL) + **▾**, in a bordered, shadowed control so it reads as **brand + menu**, not a hidden utility.

### Satellite repos (Mata, Maumahara, Panui)

Each app should include a **matching** switcher (same four labels and destinations) so users can jump back to Akomanga or another product from any surface. Use the same visual pattern: **logo tile + product label + caret** when space allows; compact icon grid when the rail is narrow.

## Optional row subtitle

Pass `brandSuffix` on [`PortalSidebar`](../src/components/portal/PortalLayout.tsx) when the shell mode isn’t the default student view (e.g. Coordinator: `Akomanga · Coordinator` in the headline).
