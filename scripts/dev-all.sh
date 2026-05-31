#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  jobs -p | xargs -r kill 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run worker &
npm run dev &
wait -n
