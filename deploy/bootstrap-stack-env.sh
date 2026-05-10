#!/usr/bin/env bash
# VPS / lokal: loyiha ildizidan — bash deploy/bootstrap-stack-env.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f deploy/stack.env ]]; then
  echo "deploy/stack.env allaqachon mavjud — hech nima qilinmadi."
  exit 0
fi

if [[ ! -f deploy/stack.env.example ]]; then
  echo "XATO: deploy/stack.env.example topilmadi."
  exit 1
fi

cp deploy/stack.env.example deploy/stack.env

if command -v openssl >/dev/null 2>&1; then
  SK="$(openssl rand -hex 32)"
  _tmp="$(mktemp)"
  while IFS= read -r line || [[ -n "$line" ]]; do
    if [[ "$line" == DJANGO_SECRET_KEY=* ]]; then
      echo "DJANGO_SECRET_KEY=${SK}"
    else
      printf '%s\n' "$line"
    fi
  done < deploy/stack.env > "$_tmp" && mv "$_tmp" deploy/stack.env
fi

echo ""
echo "deploy/stack.env yaratildi (namunadan nusxa)."
echo "Majburiy: nano deploy/stack.env"
echo "  • YOUR_VPS_IP → server IP va domeningiz (ALLOWED_HOSTS / CORS / CSRF)"
echo "  • OPENAI_API_KEY, TELEGRAM_BOT_TOKEN — kerak bo‘lsa"
echo ""
echo "Keyin: bash deploy/vps-deploy.sh  yoki  docker-compose up -d --build"
echo ""
