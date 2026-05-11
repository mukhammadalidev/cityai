#!/usr/bin/env bash
# VPS: DNS vaqtincha tuzatish (github.com / deb.debian.org "Could not resolve" bo'lsa).
# Ubuntu'da /etc/resolv.conf ba'zan symlink — unda pastdagi "Variant B" ni qo'llang.
#
# Ishlatish: sudo bash deploy/vps-fix-dns.sh
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "Root kerak: sudo bash deploy/vps-fix-dns.sh"
  exit 1
fi

echo "=== Oldin: /etc/resolv.conf ==="
ls -la /etc/resolv.conf || true
cat /etc/resolv.conf 2>/dev/null || true

BACKUP="/etc/resolv.conf.bak.$(date +%s)"
if [[ -f /etc/resolv.conf ]] && [[ ! -L /etc/resolv.conf ]]; then
  cp -a /etc/resolv.conf "$BACKUP" && echo "Zaxira: $BACKUP"
fi

echo ""
echo "=== Variant A: oddiy fayl (symlink bo'lmasa) ==="
if [[ -L /etc/resolv.conf ]]; then
  echo "/etc/resolv.conf — symlink. To'g'ridan-to'g'ri yozilmaydi."
  echo "Quyidagilardan birini qiling:"
  echo "  1) Ubuntu: sudo nano /etc/systemd/resolved.conf  → DNS=8.8.8.8 1.1.1.1"
  echo "     keyin: sudo systemctl restart systemd-resolved"
  echo "  2) Yoki: sudo rm /etc/resolv.conf && sudo ln -s /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf"
  echo "     (resolved DNS=... bilan)"
  exit 2
fi

cat >/etc/resolv.conf <<'EOF'
nameserver 8.8.8.8
nameserver 1.1.1.1
options timeout:2 attempts:3
EOF

echo ""
echo "=== Keyin ==="
cat /etc/resolv.conf

echo ""
echo "=== Tekshiruv ==="
(getent hosts github.com || true) | head -2
(getent hosts deb.debian.org || true) | head -2
if command -v curl >/dev/null 2>&1; then
  curl -sI --max-time 12 https://github.com | head -3 || echo "curl: github xato"
else
  ping -c 2 github.com || true
fi

echo ""
echo "Agar hali xato bo'lsa — provayder DNS bloklayapti yoki serverda tarmoq nosoz. Supportga yozing."
