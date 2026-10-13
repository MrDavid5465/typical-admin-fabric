#!/usr/bin/env bash
# Polls a URL until it answers (any status below 500) or a timeout elapses, so
# you don't have to re-read a background `npm run dev` log to spot readiness.
#
# Usage: wait-for-dev-server.sh [url] [timeout_seconds]
#   url defaults to http://localhost:5173/ (Vite's default port)
set -euo pipefail

url="${1:-http://localhost:5173/}"
timeout="${2:-60}"
elapsed=0
interval=1

while true; do
  code="$(curl -s -o /dev/null -w '%{http_code}' "$url" 2>/dev/null || true)"
  if [ -n "$code" ] && [ "$code" != "000" ] && [ "$code" -lt 500 ]; then
    echo "Ready: $url answered $code after ${elapsed}s"
    exit 0
  fi
  if [ "$elapsed" -ge "$timeout" ]; then
    echo "Timed out after ${timeout}s waiting for $url" >&2
    exit 1
  fi
  sleep "$interval"
  elapsed=$((elapsed + interval))
done
