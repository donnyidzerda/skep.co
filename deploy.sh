#!/bin/bash
# skep.co — one-command deploy
# Usage: ./deploy.sh
# Usage: ./deploy.sh "commit message"

set -e

MSG="${1:-update site}"

echo ""
echo "  Building..."
node build.js

echo "  Committing..."
git add .
git diff --cached --quiet && echo "  Nothing to commit — deploying current build." || git commit -m "$MSG"

echo "  Pushing to GitHub..."
git push

echo "  Deploying to Cloudflare..."
wrangler pages deploy . --project-name skep-co --commit-dirty=true

echo ""
echo "  ✓ Live at https://skep-co.pages.dev"
echo ""
