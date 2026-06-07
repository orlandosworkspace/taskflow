#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Taskflow — Deploy to Render ==="
echo ""
echo "Step 1: Push this repo to GitHub"
echo "  gh auth login"
echo "  gh repo create my-tasks --public --source=. --push"
echo ""
echo "Step 2: Deploy on Render"
echo "  1. Go to https://dashboard.render.com"
echo "  2. New + → Blueprint"
echo "  3. Connect your GitHub repo"
echo "  4. Click Apply (render.yaml is pre-configured)"
echo ""
echo "Your app will be live at: https://my-tasks.onrender.com (or similar)"
echo ""
echo "Health check: curl https://YOUR-URL/api/health"