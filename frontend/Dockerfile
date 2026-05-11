FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_USE_RELATIVE_API=1
ENV VITE_USE_RELATIVE_API=$VITE_USE_RELATIVE_API

ARG VITE_TELEGRAM_BOT_URL=https://t.me/citybotuz_bot
ENV VITE_TELEGRAM_BOT_URL=$VITE_TELEGRAM_BOT_URL

# Vite build xotirasi: compose build-arg NODE_MEMORY_MB (bo‘sh bo‘lmasin — bo‘sh bo‘lsa Node yana ~512MB).
ARG NODE_MEMORY_MB=2048
RUN NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY_MB}" node ./node_modules/vite/bin/vite.js build
# Sahifa manbasida ko‘rinadi: yangi deploy bo‘lgan-yo‘qligini CDN/brauzerdan mustaqil tekshirish.
RUN ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)" && printf '\n<!-- citybot-build %s -->\n' "$ts" >> /app/dist/index.html

FROM nginx:1.27-alpine
# Compose yuborgan build-arg ikkinchi bosqichda ham e’lon qilinmasa — "were not consumed" chiqadi.
ARG NODE_MEMORY_MB
ARG VITE_TELEGRAM_BOT_URL

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
