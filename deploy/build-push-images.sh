#!/usr/bin/env bash
# Bitta mashinada (yoki CI) build + push. Loyiha ildizidan ishga tushiring.
# Ishlatish: REGISTRY=ghcr.io/USER TAG=1.0.0 bash deploy/build-push-images.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

REGISTRY="${REGISTRY:?Masalan: ghcr.io/myuser yoki docker.io/myuser}"
TAG="${TAG:-latest}"
BE="${REGISTRY}/cityai-backend:${TAG}"
FE="${REGISTRY}/cityai-frontend:${TAG}"

echo "== Backend: ${BE} =="
docker build -t "${BE}" ./backend
docker push "${BE}"

echo "== Frontend: ${FE} =="
docker build \
  --build-arg VITE_USE_RELATIVE_API=1 \
  --build-arg VITE_TELEGRAM_BOT_URL=https://t.me/citybotuz_bot \
  --build-arg NODE_MEMORY_MB=2048 \
  -t "${FE}" \
  ./frontend
docker push "${FE}"

echo ""
echo "deploy/images.env da:"
echo "  CITYAI_BACKEND_IMAGE=${BE}"
echo "  CITYAI_FRONTEND_IMAGE=${FE}"
echo "Keyin VPSda: docker-compose -f docker-compose.images.yml --env-file deploy/images.env pull && ... up -d"
