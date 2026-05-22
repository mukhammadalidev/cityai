#!/bin/sh
set -e
if [ -n "$DJANGO_SQLITE_PATH" ]; then
  mkdir -p "$(dirname "$DJANGO_SQLITE_PATH")"
  touch "$DJANGO_SQLITE_PATH" 2>/dev/null || true
  chmod 664 "$DJANGO_SQLITE_PATH" 2>/dev/null || true
fi
python manage.py migrate --noinput
exec "$@"
