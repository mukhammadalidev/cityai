FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ARG VITE_USE_RELATIVE_API=1
ENV VITE_USE_RELATIVE_API=$VITE_USE_RELATIVE_API

# Vite katta loyihalarda default heap (~512MB) yetmaydi; VPSda build OOM bo‘lmasin.
ARG NODE_MEMORY_MB=2048
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MEMORY_MB}

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx-spa.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
