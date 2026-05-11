#!/usr/bin/env bash
# VPS (loyiha ildizi): kod + Docker yangilash — citybot.uz
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== git pull =="
git pull

echo "== Docker: frontend keshsiz build (UI o'zgarishi shu yerda) =="
docker-compose build --no-cache frontend

echo "== Backend (faqat kod o'zgarganda kerak) =="
docker-compose build backend

echo "== qayta ishga tushirish =="
docker-compose up -d

echo "== tayyor. Brauzerda Cmd+Shift+R / Ctrl+Shift+R =="
docker-compose ps
