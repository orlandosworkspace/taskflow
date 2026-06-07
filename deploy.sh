#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

REPO_NAME="${REPO_NAME:-taskflow}"
SERVICE_NAME="${SERVICE_NAME:-taskflow}"

echo "=== Taskflow — Deploy to Render ==="
echo ""

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

need_cmd git
need_cmd gh
need_cmd render
need_cmd curl

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated."
  echo "Run: gh auth login"
  exit 1
fi

if ! render whoami --output text --confirm >/dev/null 2>&1; then
  echo "Render CLI is not authenticated."
  echo "Run: render login"
  exit 1
fi

if ! render workspace current --output text --confirm 2>/dev/null | grep -q .; then
  WORKSPACE_ID="$(render workspaces --output json --confirm | python3 -c "
import json, sys
data = json.load(sys.stdin) or []
print(data[0]['id'] if data else '')
")"
  if [ -z "$WORKSPACE_ID" ]; then
    echo "No Render workspace found. Run: render workspace set"
    exit 1
  fi
  render workspace set "$WORKSPACE_ID" --confirm --output text
fi

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "Creating GitHub repo: $REPO_NAME"
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push
else
  echo "Pushing to origin ($(git remote get-url origin))"
  git push -u origin main
fi

REPO_URL="$(gh repo view --json url -q .url)"
echo ""
echo "Repository: $REPO_URL"
echo ""

SERVICE_ID="$(render services list --output json --confirm | python3 -c "
import json, sys
data = json.load(sys.stdin) or []
for item in data:
    svc = item.get('service', item)
    if svc.get('name') == '$SERVICE_NAME':
        print(svc['id'])
        break
")"

if [ -n "$SERVICE_ID" ]; then
  echo "Service '$SERVICE_NAME' already exists. Triggering deploy..."
  render deploys create "$SERVICE_ID" --wait --output text --confirm
else
  echo "Creating Render web service: $SERVICE_NAME"
  render services create \
    --name "$SERVICE_NAME" \
    --type web_service \
    --runtime python \
    --repo "$REPO_URL" \
    --branch main \
    --build-command "pip install -r requirements.txt" \
    --start-command "python3 server.py" \
    --health-check-path /api/health \
    --plan free \
    --auto-deploy \
    --confirm \
    --output json
fi

echo ""
echo "Fetching service URL..."
SERVICE_URL="$(render services list --output json --confirm | python3 -c "
import json, sys
data = json.load(sys.stdin) or []
for item in data:
    svc = item.get('service', item)
    if svc.get('name') == '$SERVICE_NAME':
        details = svc.get('serviceDetails', {})
        print(details.get('url') or svc.get('url', ''))
        break
")"

if [ -n "$SERVICE_URL" ]; then
  echo "Live at: $SERVICE_URL"
  echo "Health:  $SERVICE_URL/api/health"
  curl -fsS "$SERVICE_URL/api/health" && echo ""
else
  echo "Service created. Check status: render services list"
fi