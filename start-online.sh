#!/bin/bash
set -e

cd "$(dirname "$0")"

if ! lsof -ti :3000 >/dev/null 2>&1; then
  echo "Starting server on port 3000..."
  python3 server.py &
  SERVER_PID=$!
  sleep 1
else
  echo "Server already running on port 3000"
  SERVER_PID=""
fi

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "Install cloudflared first: brew install cloudflared"
  exit 1
fi

echo "Starting public tunnel..."
echo "Your app will be available at the trycloudflare.com URL below."
echo "Press Ctrl+C to stop the tunnel."
cloudflared tunnel --url http://localhost:3000

if [ -n "$SERVER_PID" ]; then
  kill "$SERVER_PID" 2>/dev/null || true
fi