#!/usr/bin/env bash
# VPS: ma'lumot saqlanmayapti — backend + API tez tiklash
# cd ~/cityai && bash deploy/vps-fix-api.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DC="docker compose"
command -v docker-compose >/dev/null 2>&1 && DC="docker-compose" || true

echo "== .env \$ muammosi (uvpn4) =="
[ -f .env ] && grep -q '\$' .env && mv -v .env .env.local || echo "OK"

echo "== git =="
git pull

echo "== stack.env tekshiruv =="
grep -E '^(DJANGO_ALLOWED_HOSTS|CSRF_TRUSTED_ORIGINS)=' deploy/stack.env || {
  echo "deploy/stack.env da ALLOWED_HOSTS / CSRF yo'q"
  exit 1
}

echo "== Docker qayta build (backend — SQLite 1 worker) =="
$DC build backend
$DC up -d --force-recreate --remove-orphans

echo "== Migratsiya =="
$DC exec -T backend python manage.py migrate --noinput
echo "students migratsiyalari:"
$DC exec -T backend python manage.py showmigrations students 2>/dev/null | tail -6 || true

echo "== SQLite yozish (test) =="
$DC exec -T backend python -c "
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection
connection.ensure_connection()
print('DB:', connection.settings_dict.get('NAME'))
with connection.cursor() as c:
    c.execute('PRAGMA journal_mode')
    print('journal_mode:', c.fetchone())
" 2>&1 || true

echo "== API =="
curl -sfS http://127.0.0.1:8080/api/health/ && echo ""
curl -sfS -o /dev/null -w "cities HTTP %{http_code}\n" http://127.0.0.1:8080/api/cities/ || true

echo "== Frontend ham yangilansin (Authorization proxy) =="
$DC build frontend
$DC up -d frontend

echo ""
echo "Tayyor. Brauzer: chiqib qayta kiring (/login), keyin Cmd+Shift+R."
echo "Xato davom etsa: $DC logs backend --tail 50"
