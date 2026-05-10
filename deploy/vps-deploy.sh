#!/bin/bash
# VPS da: bash deploy/vps-deploy.sh  (loyiha ildizidan)
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "== DNS (Docker Hub uchun) =="
if ! getent hosts registry-1.docker.io >/dev/null 2>&1; then
  echo "registry-1.docker.io topilmadi — resolv.conf ga 8.8.8.8 qo‘shyapman..."
  printf 'nameserver 8.8.8.8\nnameserver 1.1.1.1\n' > /etc/resolv.conf || true
fi

if ! getent hosts registry-1.docker.io >/dev/null 2>&1; then
  echo "XATO: registry-1.docker.io hali ham resolve bo‘lmayapti. DNS ni qo‘lda sozlang."
  exit 1
fi

echo "== stack.env =="
if [ ! -f deploy/stack.env ]; then
  echo "deploy/stack.env yo‘q — yaratilmoqda..."
  bash "$(dirname "$0")/bootstrap-stack-env.sh"
  echo "Avval deploy/stack.env ni tahrirlang (YOUR_VPS_IP va kalitlar), keyin qayta:"
  echo "  bash deploy/vps-deploy.sh"
  exit 1
fi

echo "== ildizdagi .env va Compose =="
if [ -f .env ] && grep -q '\$' .env 2>/dev/null; then
  echo "OGohlantirish: ildizdagi .env ichida \$ bor — Compose xato berishi mumkin."
  echo "  mv .env .env.local  &&  keyin faqat deploy/stack.env ishlatiladi"
  exit 1
fi

echo "== docker-compose =="
docker-compose up -d --build

echo "== Tayyor. Admin: docker-compose exec backend python manage.py createsuperuser =="
echo "Loglar: docker-compose logs -f --tail=80"
