#!/usr/bin/env bash
# VPS (loyiha ildizi): kod + Docker yangilash — citybot.uz
#
# MUHIM: productionda "docker-compose down" qilmang — 8080 bo‘shab, sayt eski CDN
# yoki boshqa proksi orqali "o‘zgarmagan"dek ko‘rinadi. Yangilash: faqat build + up.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Tarmoq (git va docker build uchun) =="
if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
  echo "   OK: ping 8.8.8.8"
else
  echo "   XATO: Internetga chiqish yo'q (yoki ICMP o'chirilgan). Provayder / firewall."
  exit 1
fi
if command -v curl >/dev/null 2>&1; then
  if ! curl -sfI --max-time 15 -o /dev/null https://github.com; then
    echo "   XATO: https://github.com ochilmadi — odatda DNS (Could not resolve host)."
    echo "   Bir martalik tuzatish: sudo bash deploy/vps-fix-dns.sh"
    echo "   Qo'lda: cat /etc/resolv.conf  — nameserver 8.8.8.8 bo'lishi kerak (yoki systemd-resolved DNS=...)."
    exit 1
  fi
  echo "   OK: github.com (HTTPS)"
else
  if ! getent hosts github.com >/dev/null 2>&1; then
    echo "   XATO: github.com DNS da yo'q. curl o'rnatilgan bo'lsa aniqroq tekshiriladi."
    echo "   sudo bash deploy/vps-fix-dns.sh"
    exit 1
  fi
  echo "   OK: github.com (getent)"
fi

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

echo ""
echo "== VPSda yangi UI bormi? (build vaqti HTML oxirida) =="
if curl -sfS --max-time 8 "http://127.0.0.1:8080/" | tail -n 3; then
  echo "(Agar citybot-build ko‘rinmasa: frontend port 8080 emas yoki konteyner ishlamayapti.)"
else
  echo "XATO: 127.0.0.1:8080 javob bermadi. docker-compose.yml ports: 127.0.0.1:8080:80 bo‘lishi kerak."
  exit 1
fi

echo ""
echo "== git commit (VPSdagi kod) =="
git rev-parse --short HEAD

echo ""
echo "Agar shu yerda yangi build bor-yu, lekin domen eski ko‘rinsa: Cloudflare → Caching →"
echo "Purge Everything yoki 3 soatlik Development mode; 'Cache Everything' Page Rule bo‘lsa o‘chiring."
