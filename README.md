# City Services AI — to‘liq loyiha

Django REST **backend**, React **frontend**, **Telegram bot** (aiogram). Bitta SQLite bazasi va umumiy `.env`.

## Talablar

- Python 3.11+ (tavsiya etiladi)
- Node.js 18+
- [BotFather](https://t.me/BotFather) dan olingan `TELEGRAM_BOT_TOKEN`

## 1. Muhit o‘zgaruvchilari

Loyiha ildizida `.env` yarating (namuna: `.env.example`):

- `TELEGRAM_BOT_TOKEN` — majburiy (bot uchun)
- `DJANGO_SECRET_KEY` — ishlab chiqishda ixtiyoriy
- `VITE_API_BASE_URL=http://localhost:8000` — brauzerda lokal ishlatish uchun API
- `TELEGRAM_WEB_APP_URL` — Telegram **Web App** uchun frontendning **HTTPS** manzili (odatda [ngrok](https://ngrok.com/)), masalan `https://xxxx.ngrok-free.app` (oxirida `/` yo‘q). Bot biznes tanlangach `…/b/<slug>` havolasini ochadi.

## 2. Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
```

Demo hisoblar (seed chiqishida ham ko‘rsatiladi):

- **Super admin:** `admin` / `admin12345`
- **Biznes egasi:** `biznes0` … `biznes9` / `demo12345`
- **Ta’lim demo kabineti** (`seed_demo` o‘quv markazi yaratgan bo‘lsa): ustoz `ustoz_demo` / `demo12345`, o‘quvchi `oquvchi_demo` / `demo12345`
- **Super admin** istalgan o‘quv markaz uchun login yaratish: `admin` bilan kirish → **Bizneslar** → markazni ochish → **Ta’lim kabinetlari** bo‘limi (ustoz / o‘quvchi / ota-ona)

Server:

```powershell
python manage.py runserver 0.0.0.0:8000
```

API: `http://localhost:8000/api/`

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Brauzer: `http://localhost:5173` (Vite `envDir` orqali loyiha ildizidagi `VITE_*` o‘qiladi).

## 4. Telegram bot

Alohida terminalda (venv faol, `cd backend`):

```powershell
python manage.py run_telegram_bot
```

Yoki:

```powershell
python botapp/telegram_bot.py
```

Bot `apps.businesses`, `apps.catalog`, `apps.customers` modellaridan foydalanadi (faqat **faol** bizneslar va **active** pozitsiyalar).

### Telegram Web App (ngrok)

1. Backend `runserver` va frontend `npm run dev` ishlamoqda bo‘lsin.
2. Yangi terminal: `ngrok http 5173` (yoki Vite boshqa portda bo‘lsa, shu port).
3. `.env` da `TELEGRAM_WEB_APP_URL=https://<ngrok-host>` ni yangilang (faqat domen, yo‘l qo‘shmang).
4. Botni qayta ishga tushiring. Foydalanuvchi biznesni tanlagach **«Salon sahifasi (Web App)»** tugmasi ochiladi — ichida React `/b/<biznes-slug>` sahifasi.
5. Telefonda API `localhost` emas: Vite `/api` va `/media` ni avtomatik Django ga proxylaydi; `DEBUG=1` paytida CORS ngrok domenlariga ruxsat berilgan.

## 5. Muammolar

| Muammo | Yechim |
|--------|--------|
| CORS | `DJANGO_DEBUG=1` va `CORS_ALLOWED_ORIGINS` yoki sozlamadagi default portlar |
| Bo‘sh bot | `seed_demo` ishganini tekshiring; biznes `status=active` bo‘lishi kerak |
| Frontend API | Lokalda `VITE_API_BASE_URL` + `runserver`. Ngrok/Web App: domen orqali ochilganda so‘rovlar avtomatik **nisbiy** `/api` orqali proxylanadi |
| Web App ochilmaydi | `TELEGRAM_WEB_APP_URL` HTTPS va ngrok tunnel **5173** ga tushganini tekshiring |

## Xavfsizlik

`.env` va bot tokenlarini gitga qo‘shmang. Token oqib ketgan bo‘lsa, BotFather orqali **Revoke** qiling.
