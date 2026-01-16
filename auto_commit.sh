#!/bin/bash

# Auto-commit script for MetroMaps8.1

echo "🚀 Starting Auto-Commit..."

# Add all changes
git add .

# Commit with timestamp
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
git commit -m "Auto-update: $TIMESTAMP"

# Push to remote (if configured)
if git remote -v | grep -q 'origin'; then
    echo "☁️ Pushing to origin..."
    git push origin main
else
    echo "⚠️ No remote 'origin' found. Changes committed locally only."
    echo "   Run 'git remote add origin <url>' to configure GitHub."
fi

echo "✅ Done!"
