#!/usr/bin/env bash
# Face ID avtomatik davomat: Django + Hikvision listener bitta buyruqda.
# To'xtatish: Ctrl+C

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND="$ROOT/backend"
cd "$BACKEND"

if [[ ! -f "marta/bin/activate" ]]; then
  echo "Xato: $BACKEND/marta/bin/activate topilmadi."
  echo "Avval: cd backend && python3.11 -m venv marta && source marta/bin/activate && pip install -r requirements.txt"
  exit 1
fi

# Loyiha ildizidagi .env ni Django o'zi o'qiydi; shu yerda faqat xabar.
source marta/bin/activate

echo ""
echo "=========================================="
echo "  Face ID → avtomatik «keldi» davomati"
echo "=========================================="
echo ""
echo "Tekshiring: loyiha ildizida .env da"
echo "  HIKVISION_IP, HIKVISION_USERNAME, HIKVISION_PASSWORD,"
echo "  DJANGO_ATTENDANCE_API_URL (odatda http://127.0.0.1:8000/...)"
echo ""
echo "1) Django 8000-portda ishga tushmoqda..."
python manage.py runserver 0.0.0.0:8000 &
DJ_PID=$!

cleanup() {
  echo ""
  echo "To'xtatilmoqda (Django ham yopiladi)..."
  kill "$DJ_PID" 2>/dev/null || true
  wait "$DJ_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 3
echo "2) Hikvision listener ishlamoqda (hodisalar kutilmoqda)..."
echo "   To'xtatish: Ctrl+C"
echo ""
python manage.py listen_hikvision
