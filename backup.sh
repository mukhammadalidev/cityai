#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="$ROOT_DIR/backups/$STAMP"

mkdir -p "$BACKUP_DIR"

echo "Backup started: $STAMP"
echo "Target: $BACKUP_DIR"

# 1) Project snapshot (without heavy/generated folders)
tar -czf "$BACKUP_DIR/chatbot-project-$STAMP.tar.gz" \
  --exclude="backups" \
  --exclude="./backups" \
  --exclude="$ROOT_DIR/backend/.venv" \
  --exclude="$ROOT_DIR/frontend/node_modules" \
  --exclude="$ROOT_DIR/frontend/dist" \
  --exclude="$ROOT_DIR/backend/__pycache__" \
  --exclude="$ROOT_DIR/**/__pycache__" \
  -C "$ROOT_DIR" .

# 2) SQLite DB backup (if exists)
if [[ -f "$ROOT_DIR/backend/db.sqlite3" ]]; then
  cp "$ROOT_DIR/backend/db.sqlite3" "$BACKUP_DIR/db-$STAMP.sqlite3"
  echo "DB backup created."
else
  echo "DB file not found, skipped."
fi

# 3) Env backup
if [[ -f "$ROOT_DIR/.env" ]]; then
  cp "$ROOT_DIR/.env" "$BACKUP_DIR/.env-$STAMP"
  echo ".env backup created."
else
  echo ".env file not found, skipped."
fi

echo "Done."
echo "Created files:"
ls -la "$BACKUP_DIR"
