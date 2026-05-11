#!/usr/bin/env bash
# VPS (~/cityai): git pull blokini yechish + Docker 80 ni bo‘shatish + host nginx HTTP-only.
# Certbotdan keyin: sudo cp deploy/nginx-citybot.uz.conf /etc/nginx/sites-available/citybot.uz
#
# Ishlatish: cd ~/cityai && bash deploy/vps-recovery.sh
set -euo pipefail
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "== 1) Git: pull bloklovchilari =="
if git status --porcelain deploy/nginx-citybot.uz.conf 2>/dev/null | grep -q '^??'; then
  BAK="/tmp/nginx-citybot.uz.untracked.$(date +%s).bak"
  echo "   Untracked deploy/nginx-citybot.uz.conf -> $BAK"
  mv deploy/nginx-citybot.uz.conf "$BAK"
fi
if ! git diff --quiet docker-compose.yml 2>/dev/null; then
  echo "   docker-compose.yml mahalliy o'zgarishlar bekor qilinadi (keyin origin bilan bir xil bo'ladi)."
  git checkout -- docker-compose.yml
fi

echo "== 2) git pull =="
git pull

echo "== 3) Docker: frontend faqat 127.0.0.1:8080 (80-port host nginx uchun) =="
docker-compose up -d --force-recreate --remove-orphans

echo "== 4) Host nginx: HTTP-only + ACME papkasi =="
sudo mkdir -p /var/www/certbot
sudo cp "$REPO_ROOT/deploy/nginx-citybot.uz.http-only.conf" /etc/nginx/sites-available/citybot.uz
sudo ln -sf /etc/nginx/sites-available/citybot.uz /etc/nginx/sites-enabled/citybot.uz
sudo nginx -t
sudo systemctl enable nginx 2>/dev/null || true
sudo systemctl start nginx 2>/dev/null || true
sudo systemctl reload nginx 2>/dev/null || sudo systemctl restart nginx

echo ""
echo "== Tayyor. Tekshiruv =="
curl -sI --max-time 5 "http://127.0.0.1:8080/" | head -3 || true
curl -sI --max-time 5 "http://127.0.0.1/" -H "Host: citybot.uz" | head -5 || true

echo ""
echo "== Keyingi qadam: Let's Encrypt =="
echo "sudo certbot certonly --webroot -w /var/www/certbot -d citybot.uz -d www.citybot.uz"
echo ""
echo "Sertifikat chiqqach HTTPS nginx:"
echo "sudo cp $REPO_ROOT/deploy/nginx-citybot.uz.conf /etc/nginx/sites-available/citybot.uz"
echo "sudo nginx -t && sudo systemctl reload nginx"
