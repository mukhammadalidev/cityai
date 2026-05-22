#!/usr/bin/env bash
# VPS: backend nima uchun ishlamayapti — tez diagnostika
# Ishlatish: cd ~/cityai && bash deploy/vps-check-backend.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DC="docker compose"
if ! $DC version >/dev/null 2>&1; then
  DC="docker-compose"
fi

echo "== 1) Konteynerlar =="
$DC ps -a || true

echo ""
echo "== 2) Backend oxirgi loglar =="
$DC logs backend --tail 60 2>&1 || true

echo ""
echo "== 3) API (frontend nginx orqali 8080) =="
code="$(curl -sS -o /tmp/citybot-health.json -w '%{http_code}' --max-time 10 http://127.0.0.1:8080/api/health/ || echo 000)"
echo "HTTP $code"
cat /tmp/citybot-health.json 2>/dev/null || echo "(javob yo'q — backend yoki nginx ishlamayapti)"
echo ""

echo "== 4) API to'g'ridan-to'g'ri backend konteynerida =="
if bid="$($DC ps -q backend 2>/dev/null | head -1)" && [ -n "$bid" ]; then
  $DC exec -T backend python -c \
    "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/api/health/').read().decode())" \
    2>&1 || echo "XATO: backend ichida health ochilmadi"
else
  echo "XATO: backend konteyner topilmadi yoki to'xtagan (Exited)"
fi

echo ""
echo "== 5) deploy/stack.env =="
if [ ! -f deploy/stack.env ]; then
  echo "XATO: deploy/stack.env yo'q. bash deploy/bootstrap-stack-env.sh"
else
  grep -E '^(DJANGO_ALLOWED_HOSTS|CORS_ALLOWED_ORIGINS|CSRF_TRUSTED_ORIGINS|DJANGO_SECRET_KEY)=' deploy/stack.env \
    | sed 's/DJANGO_SECRET_KEY=.*/DJANGO_SECRET_KEY=***hidden***/' || true
fi

echo ""
echo "== 6) ildizdagi .env (Compose \$ xatolari) =="
if [ -f .env ]; then
  if grep -q '\$' .env 2>/dev/null; then
    echo "OGOHLANTIRISH: .env ichida \$ bor — 'uvpn4' ogohlantirishi shundan."
    echo "  Yechim: mv .env .env.local"
  else
    echo "OK: .env da \$ yo'q (yoki fayl bo'sh)"
  fi
else
  echo "OK: ildizda .env yo'q"
fi

echo ""
echo "== 7) Backend unhealthy (healthcheck) =="
echo "  docker compose logs backend --tail 100"
echo "  docker compose up -d --force-recreate backend"
echo ""
echo "== 8) Tavsiya (backend Exited / 502 / 400) =="
echo "  [ -f .env ] && grep -q '\\\$' .env && mv .env .env.local"
echo "  docker compose up -d --force-recreate --remove-orphans"
echo "  docker compose exec backend python manage.py migrate --noinput"
echo "  deploy/stack.env da DJANGO_ALLOWED_HOSTS=citybot.uz,www.citybot.uz,185.191.141.207,frontend,backend"
echo "  CSRF_TRUSTED_ORIGINS=https://citybot.uz,https://www.citybot.uz"
echo "  CORS_ALLOWED_ORIGINS=https://citybot.uz,https://www.citybot.uz"
