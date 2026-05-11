#!/usr/bin/env bash
# VPS: Telegram botni fon rejimida ishga tushirish / to‘xtatish.
# Oldin deploy/stack.env da TELEGRAM_BOT_TOKEN=... (BotFather dan) bo‘lishi kerak.
#
# Ishlatish: cd ~/cityai && bash deploy/vps-telegram-bot.sh start
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NAME="${TGBOT_CONTAINER_NAME:-cityai_telegram_bot}"

dc() {
  if command -v docker-compose >/dev/null 2>&1; then
    docker-compose "$@"
  else
    docker compose "$@"
  fi
}

case "${1:-start}" in
  start)
    if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
      echo "Bot allaqachon ishlamoqda: $NAME"
      exit 0
    fi
    if docker ps -a --format '{{.Names}}' | grep -qx "$NAME"; then
      echo "Eski konteyner qayta yoqilmoqda: $NAME"
      docker start "$NAME"
      exit 0
    fi
    echo "Yangi konteyner (bir martalik image + migrate)..."
    dc run -d --name "$NAME" --no-deps backend python manage.py run_telegram_bot
    echo "OK: $NAME"
    echo "Log: bash deploy/vps-telegram-bot.sh logs"
    ;;
  stop)
    docker rm -f "$NAME" 2>/dev/null && echo "To'xtatildi: $NAME" || echo "Konteyner yo'q: $NAME"
    ;;
  status)
    docker ps -a --filter "name=^/${NAME}$" --filter "name=${NAME}" 2>/dev/null || docker ps -a | grep -F "$NAME" || true
    ;;
  logs)
    docker logs -f --tail 200 "$NAME"
    ;;
  *)
    echo "Foydalanish: $0 {start|stop|status|logs}"
    exit 1
    ;;
esac
