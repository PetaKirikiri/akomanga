#!/usr/bin/env bash
# Start Mata (default ../mata) then Akomanga shell so /mata proxy always has an upstream.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MATA_DIR="$(cd "${MATA_DIR_OVERRIDE:-$ROOT/../mata}" && pwd)"
cleanup() {
  if [[ -n "${MATA_PID:-}" ]] && kill -0 "$MATA_PID" 2>/dev/null; then
    kill "$MATA_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

if [[ ! -f "$MATA_DIR/package.json" ]]; then
  echo "dev-with-mata: no mata repo at $MATA_DIR — set MATA_DIR_OVERRIDE or place mata next to akomanga." >&2
  exit 1
fi

echo "dev-with-mata: starting Mata from $MATA_DIR (VITE_APP_BASE=/mata/)"
(cd "$MATA_DIR" && VITE_APP_BASE=/mata/ npm run dev) &
MATA_PID=$!

echo "dev-with-mata: waiting for http://127.0.0.1:5176/mata/ (Mata needs VITE_APP_BASE=/mata/ so Vite emits /mata/src/... not /src/...)"
ready=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:5176/mata/" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 0.25
done
if [[ "$ready" -ne 1 ]]; then
  echo "dev-with-mata: Mata must serve http://127.0.0.1:5176/mata/ (not only /). From mata: VITE_APP_BASE=/mata/ npm run dev — or npm run dev:shell. Otherwise /src/main.tsx loads the Akomanga app." >&2
  exit 1
fi

echo "dev-with-mata: starting Akomanga from $ROOT"
cd "$ROOT"
npm run dev
