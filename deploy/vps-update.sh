#!/usr/bin/env bash
# VPS (loyiha ildizi): kod + Docker yangilash — citybot.uz
#
# MUHIM: productionda "docker-compose down" qilmang — 8080 bo‘shab, sayt eski CDN
# yoki boshqa proksi orqali "o‘zgarmagan"dek ko‘rinadi. Yangilash: faqat build + up.
#
# SSH "qotgan"dek: build paytida pip 8MB+ tortadi — sekin tarmoqda log uzoq jim turadi.
# Tavsiya: avvalo "tmux new -s dep" ichida ishga tushiring; Macda ~/.ssh/config: ServerAliveInterval 60
# Agar github tekshiruvi yolg'on xato bersa: SKIP_EXTERNAL_NETCHECK=1 bash deploy/vps-update.sh
set -euo pipefail
cd "$(dirname "$0")/.."

echo "== Tarmoq (git va docker build uchun) =="
if ping -c 1 -W 2 8.8.8.8 >/dev/null 2>&1; then
  echo "   OK: ping 8.8.8.8"
else
  echo "   XATO: Internetga chiqish yo'q (yoki ICMP o'chirilgan). Provayder / firewall."
  exit 1
fi
# GitHub: DNS silliq bo'lganda curl xato, lekin getent/ping ishlaydi — bir nechta usul.
github_ok=0
if getent hosts github.com >/dev/null 2>&1; then
  github_ok=1
  echo "   OK: github.com (DNS — getent)"
fi
if [[ "$github_ok" -eq 0 ]] && ping -c 1 -W 5 github.com >/dev/null 2>&1; then
  github_ok=1
  echo "   OK: github.com (ping)"
fi
if [[ "$github_ok" -eq 0 ]] && command -v curl >/dev/null 2>&1; then
  if curl -sfI --max-time 25 -o /dev/null https://github.com 2>/dev/null; then
    github_ok=1
    echo "   OK: github.com (HTTPS)"
  fi
fi
if [[ "$github_ok" -eq 0 ]]; then
  if [[ "${SKIP_EXTERNAL_NETCHECK:-}" == "1" ]]; then
    echo "   OGOHLANTIRISH: github tekshiruvi o'tmadi — SKIP_EXTERNAL_NETCHECK=1, davom etamiz."
  else
    echo "   XATO: github.com topilmadi / HTTPS ochilmadi."
    echo "   DNS: sudo bash deploy/vps-fix-dns.sh  yoki  /etc/systemd/resolved.conf  ichida DNS=8.8.8.8"
    echo "   Vaqtincha: SKIP_EXTERNAL_NETCHECK=1 bash deploy/vps-update.sh  (git pull xato bersa baribir DNS kerak)"
    exit 1
  fi
fi

echo "== git pull =="
git pull

echo "== Docker: backend keshsiz build (sekin internetda 15–40+ daqiqa — jim turishi normal) =="
docker-compose build --no-cache backend

echo "== Docker: frontend keshsiz build (npm + vite — yana uzoq bo‘lishi mumkin) =="
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
