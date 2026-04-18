#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

NODE_BIN="${npm_node_execpath:-node}"
NODE_DIR="$(dirname "$NODE_BIN")"
export PATH="$NODE_DIR:$PATH"
"$NODE_BIN" "$ROOT_DIR/scripts/check-node.mjs"

cleanup() {
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM

(
  cd "$ROOT_DIR/apps/api"
  "$ROOT_DIR/node_modules/.bin/tsx" watch src/index.ts
) &
API_PID=$!

API_PORT="${API_PORT:-4000}"

for _ in {1..30}; do
  if curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
    break
  fi

  if ! kill -0 "$API_PID" >/dev/null 2>&1; then
    echo "API process exited before it became healthy." >&2
    exit 1
  fi

  sleep 1
done

if ! curl -fsS "http://127.0.0.1:${API_PORT}/health" >/dev/null 2>&1; then
  echo "API did not become healthy on port ${API_PORT}." >&2
  exit 1
fi

(
  cd "$ROOT_DIR/apps/mobile"
  ./node_modules/.bin/expo start --clear --ios
)
