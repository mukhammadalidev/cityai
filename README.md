# City Services AI

Django REST **backend**, React (Vite) **frontend**, **Telegram bot** (aiogram). Bitta **SQLite** bazasi; muhit o‘zgaruvchilari loyiha **ildizidagi** `.env` orqali o‘qiladi (`backend/config/settings.py`).

## Loyihaning funksiyalari (qisqa ro‘yxat)

### Umumiy va kirish
- **JWT** orqali kirish; rollar: super admin, biznes egasi, menejer, ta’lim uchun ustoz / o‘quvchi / ota-ona.
- **Ochiq sahifalar:** shahar (`/c/...`), kategoriya, biznes kartochkasi (`/b/...`) — Telegram Web App bilan bog‘lash mumkin.

### Platforma (super admin, `/admin`)
- Shaharlar va xizmat **kategoriyalari**, **bizneslar** moderatsiyasi.
- **Tariflar (subscriptions)** va **billing** / hisob-fakturalar.
- Platforma **analitikasi** va sozlamalar.

### Biznes kabineti (`/business`)
- **Boshqaruv paneli** (biznes turiga qarab dinamik ko‘rsatkichlar).
- **Katalog:** mahsulot / xizmat / kurs (narx, rasm, holat); ta’lim markazlarida **kurs / kitob / mahsulot** ajratish; `slug` avtogeneratsiya.
- **Lidlar** (ariza / qiziqish turlari, jumladan kursga yozilish).
- **Bronlar** va **buyurtmalar** (biznes turiga qarab ko‘rinadi).
- **Menejerlar** (biznes a’zolari).
- **AI bilim bazasi** (biznesga bog‘liq kontent), **AI sarfi**, **marketing** matn generatori (tarifga bog‘liq; demo rejim mumkin).
- **Billing:** joriy tarif, cheklovlar.

### O‘quv markazi (ta’lim) moduli
- **O‘quvchilar** va **kunlik/oylik davomat** (tarifda `has_edu_attendance` bo‘lsa).
- **O‘quv guruhlari**, **ustozlar**, **materiallar** (kitob/mahsulot — tarifga bog‘liq).
- **Baholar va reyting** (0–100 ball, oylik filtr, podium ko‘rinishidagi reyting, jadval).
- **Ta’lim kabinetlari** uchun login yaratish (ustoz / o‘quvchi / ota-ona) — tarifda portallar bo‘lsa.
- **Davomat o‘zgarganda** ota-onaga **Telegram xabari** (ota-ona profilida `telegram_id` + `TELEGRAM_BOT_TOKEN`).

### Kabinetlar (`/portal`)
- **Ustoz:** o‘z guruhlari va o‘quvchilar ro‘yxati.
- **O‘quvchi:** profil, davomat, baholar, reyting.
- **Ota-ona:** farzand ismi (sarlavhada), profil, Telegram ID kiritish, davomat, baholar, reyting.

### Telegram bot
- **Biznes turi** bo‘yicha menyu: xizmatlar/narxlar, manzil, operator, boshqa salon; restoran uchun alohiga tugmalar (menyu, bron, yetkazib berish va hokazo).
- **🤖 AI yordamchi** — salon tanlangach pastki menyuda tugma; savol matnini yuboriladi, javob **OpenAI Chat Completions** orqali keladi. Kontekst: tanlangan **biznes** maydonlari + admin paneldagi **AI bilim bazasi** (`apps.knowledge`, biznesga bog‘langan faol yozuvlar). Kalit yo‘q bo‘lsa, bot foydalanuvchiga `OPENAI_API_KEY` yo‘qligi haqida xabar beradi.
- **Web App** havolasi (`TELEGRAM_WEB_APP_URL`) — ochiq `/b/<slug>` sahifa.
- Mijozlar bilan ishlash: bron, buyurtma, lid — admin va mijozga bildirishnomalar (mavjud modullar bo‘yicha).

### Texnik qatlam
- **REST API** (`/api/...`), **CORS** (lokal + ngrok).
- **Bot engine:** sessiyalar, shablonlar, xabar loglari (API orqali).
- Django **admin** panel: jadval va baholar (rangli ball) boshqaruvi.

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
| `OPENAI_API_KEY` | **Telegram botdagi AI yordamchi**, marketing va boshqa AI funksiyalari uchun (botda suhbat uchun praktikada majburiy) |
| `OPENAI_MODEL` | Ixtiyoriy; default `gpt-4o-mini` (`botapp/services/ai_service.py`) |

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

**AI yordamchi:** `.env` da `OPENAI_API_KEY` bo‘lishi kerak; kod `backend/.env` va loyiha ildizidagi `.env` ni o‘qiydi (`telegram_bot.py`). AI rejimidan chiqish uchun pastdagi menyudan boshqa tugmani bosing. Stol bron qilish bosqichida AI tugmasi bloklanadi — avval bronni tugating yoki bekor qiling.

## Telegram Web App (telefonda sinash)

1. Backend `runserver` va frontend `npm run dev` ishlayotgan bo‘lsin.
2. Tunnel: masalan `cd frontend && npm run tunnel:ngrok` yoki `ngrok http 5173` (Vite qaysi portda bo‘lsa, shu port).
3. `.env` da `TELEGRAM_WEB_APP_URL=https://<tunnel-host>` (path qo‘shmang). Kerak bo‘lsa `VITE_TELEGRAM_WEB_APP_URL` va `VITE_TUNNEL_HMR_HOST` ni ham `.env.example` bo‘yicha sozlang.
4. Botni qayta ishga tushiring. Biznes tanlangach **Web App** tugmasi `/b/<biznes-slug>` sahifasini ochadi.
5. Telefonda `localhost` ishlamaydi: Vite dev rejimida `/api` va `/media` odatda Django ga proxylanadi; `DEBUG=1` paytida CORS ngrok domenlariga ruxsat berilgan.

## Production: Docker (VPS / server)

Men sizning serveringizga ulanib deploy qila olmayman; quyidagilar tayyor:

1. Serverda **Docker** va **Docker Compose** o‘rnating.
2. Loyihani klonlang, **`bash deploy/bootstrap-stack-env.sh`** — `deploy/stack.env` yaratiladi (`DJANGO_SECRET_KEY` avto). Keyin **`nano deploy/stack.env`**: `YOUR_VPS_IP` ni haqiqiy IP/domen bilan almashtiring. (Qo‘lda: `cp deploy/stack.env.example deploy/stack.env`.) Kalitda `$` bo‘lmasin — aks holda Compose xato beradi. Loyiha ildizidagi `.env` bo‘lsa va ichida `$` bo‘lsa: `mv .env .env.local`.
3. `docker-compose up -d --build` yoki **`bash deploy/vps-deploy.sh`** (DNS tekshiruvi bilan).
4. Birinchi marta: `docker compose exec backend python manage.py createsuperuser`
5. Telegram bot alohida jarayon sifatida ishga tushirish kerak bo‘lsa, serverda `backend` virtual muhit yoki alohida konteynerda `python manage.py run_telegram_bot` (`.env` bilan).

SQLite va yuklangan fayllar **volume**da saqlanadi (`app_data`, `app_media`). HTTPS uchun server oldidan **Caddy** yoki **nginx** bilan reverse proxy qo‘shing.

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
| AI javob bermaydi / «kalit yo‘q» | `.env` da `OPENAI_API_KEY`; bot jarayonini qayta ishga tushiring; bilim bazasi bo‘sh bo‘lsa ham javob kelishi kerak |
| Web App ochilmaydi | `TELEGRAM_WEB_APP_URL` HTTPS va tunnel to‘g‘ri portga ulanganmi |
| ngrok ogohlantirishi | `.env.example` dagi `ERR_NGROK_6024` / tunnel izohlari |

## Xavfsizlik

`.env`, bot tokenlari va production `DJANGO_SECRET_KEY` ni umumiy repoga qo‘shmang. Token oqib ketgan bo‘lsa, BotFather orqali **Revoke** qiling.
