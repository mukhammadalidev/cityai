#!/usr/bin/env bash
# VPS (loyiha ildizi): kod + Docker yangilash — citybot.uz
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== git pull =="
git pull

echo "== Docker: backend keshsiz build =="
docker-compose build --no-cache backend

echo "== Docker: frontend keshsiz build =="
docker-compose build --no-cache frontend

echo "== qayta ishga tushirish (yangi image majburan konteynerga) =="
docker-compose up -d --force-recreate --remove-orphans

echo "== Django migratsiyalar =="
docker-compose exec -T backend python manage.py migrate --noinput

echo "== tayyor. Brauzerda Cmd+Shift+R / Ctrl+Shift+R =="
docker-compose ps
