# City Services AI

Django REST **backend**, React (Vite) **frontend**, **Telegram bot** (aiogram). Bitta **SQLite** bazasi; muhit o‘zgaruvchilari loyiha **ildizidagi** `.env` orqali o‘qiladi (`backend/config/settings.py`).

## Talablar

- **Python 3.11+** (tavsiya; macOS’da ba’zan `python` yo‘q — `python3.11` ishlating)
- **Node.js 18+**
- [BotFather](https://t.me/BotFather) dan olingan `TELEGRAM_BOT_TOKEN` (bot ishlatilsa)

## Tez boshlash

1. Ildizda `.env` yarating: `.env.example` ni nusxalang va qiymatlarni to‘ldiring.
2. Backend: virtual muhit, migratsiya, demo ma’lumot (pastdagi bo‘limlar).
3. Frontend: `npm install` va `npm run dev`.
4. (Ixtiyoriy) Telegram bot: alohida terminalda `run_telegram_bot`.

## Muhit o‘zgaruvchilari (`.env`)

Batafsil izohlar `.env.example` ichida. Asosiy qatorlar:

| O‘zgaruvchi | Vazifasi |
|-------------|--------|
| `TELEGRAM_BOT_TOKEN` | Bot uchun (majburiy, agar bot ishga tushirilsa) |
| `DJANGO_SECRET_KEY` | Production’da majburiy tarzda kuchli qiymat |
| `DJANGO_DEBUG` | Lokalda odatda `1` |
| `VITE_API_BASE_URL` | Brauzerda API manzili, masalan `http://localhost:8000` |
| `VITE_TELEGRAM_BOT_URL` | Bot havolasi (`https://t.me/...`) |
| `TELEGRAM_WEB_APP_URL` | Web App uchun **HTTPS** domen (path va oxirgi `/` **siz**), masalan ngrok |
| `OPENAI_API_KEY` | Marketing / AI funksiyalari uchun (ixtiyoriy) |

Telegram Web App va tunnel uchun qo‘shimcha: `VITE_TELEGRAM_WEB_APP_URL`, `VITE_TUNNEL_HMR_HOST` — `.env.example` dagi izohlarga qarang.

## Backend

### macOS / Linux

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8000
```

Agar tizimda faqat `python3` bo‘lsa va u 3.11+ bo‘lsa, `python3.11` o‘rniga `python3` ishlating.

### Windows (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver 0.0.0.0:8000
```

- **Admin panel:** `http://localhost:8000/admin/`
- **API:** `http://localhost:8000/api/`

### Demo hisoblar

`seed_demo` tugagach konsolda ham ko‘rinadi:

- **Super admin:** `admin` / `admin12345`
- **Biznes egasi:** `biznes0` … `biznes9` / `demo12345`
- **Ta’lim demo** (o‘quv markazi yaratilgan bo‘lsa): `ustoz_demo`, `oquvchi_demo` / `demo12345`

Super admin orqali istalgan ta’lim markazi uchun kabinet loginlari: **Bizneslar** → markaz → **Ta’lim kabinetlari**.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Odatda `http://localhost:5173`. Vite loyiha **ildizidagi** `VITE_*` o‘zgaruvchilarni o‘qiydi (`envDir`).

- **Build:** `npm run build`, keyin `npm run preview`

## Telegram bot

Virtual muhit faol bo‘lishi kerak (`source .venv/bin/activate` yoki Windows aktivatsiyasi):

```bash
cd backend
python manage.py run_telegram_bot
```

Yoki:

```bash
python botapp/telegram_bot.py
```

Bot **faol** bizneslar va katalogdagi **active** pozitsiyalardan foydalanadi.

## Telegram Web App (telefonda sinash)

1. Backend `runserver` va frontend `npm run dev` ishlayotgan bo‘lsin.
2. Tunnel: masalan `cd frontend && npm run tunnel:ngrok` yoki `ngrok http 5173` (Vite qaysi portda bo‘lsa, shu port).
3. `.env` da `TELEGRAM_WEB_APP_URL=https://<tunnel-host>` (path qo‘shmang). Kerak bo‘lsa `VITE_TELEGRAM_WEB_APP_URL` va `VITE_TUNNEL_HMR_HOST` ni ham `.env.example` bo‘yicha sozlang.
4. Botni qayta ishga tushiring. Biznes tanlangach **Web App** tugmasi `/b/<biznes-slug>` sahifasini ochadi.
5. Telefonda `localhost` ishlamaydi: Vite dev rejimida `/api` va `/media` odatda Django ga proxylanadi; `DEBUG=1` paytida CORS ngrok domenlariga ruxsat berilgan.

## Loyiha tuzilishi (qisqa)

- **`backend/`** — Django ilovalari: `accounts`, `businesses`, `catalog`, `leads`, `bookings`, `orders`, `students`, `teachers`, `subscriptions`, `billing`, `analytics`, `knowledge`, `bot_engine` va hokazo. Telegram mantiq `botapp/`.
- **`frontend/`** — React: `/admin` (platforma), `/business` (kabinet), `/portal` (ta’lim rollari), ochiq sahifalar `/c/...`, `/b/...`.

## Git va GitHub

- `.gitignore` orqali e’tibor bering: `.env`, `backend/db.sqlite3`, `backend/media/`, `backend/.venv/`, `frontend/node_modules/`, `frontend/dist/`, `backups/` va boshqalar commit qilinmaydi.
- Yangi repozitoriy: `git init`, keyin `git add` / `git commit`, GitHub’da bo‘sh repo yaratib `git remote add origin ...` va `git push`.

## Muammolar

| Muammo | Yechim |
|--------|--------|
| `command not found: python` | `python3.11` yoki `python3` ishlating; yoki venv ichidagi `python` |
| CORS | `DJANGO_DEBUG=1`; kerak bo‘lsa `CORS_ALLOWED_ORIGINS` |
| Bo‘sh bot | `seed_demo` ishgani, biznes `active` ekanini tekshiring |
| Web App ochilmaydi | `TELEGRAM_WEB_APP_URL` HTTPS va tunnel to‘g‘ri portga ulanganmi |
| ngrok ogohlantirishi | `.env.example` dagi `ERR_NGROK_6024` / tunnel izohlari |

## Xavfsizlik

`.env`, bot tokenlari va production `DJANGO_SECRET_KEY` ni umumiy repoga qo‘shmang. Token oqib ketgan bo‘lsa, BotFather orqali **Revoke** qiling.
