# Loyiha konteksti (LLM / jamoa uchun prompt)

**Loyiha nomi:** City Services AI (Citybot)  
**Maqsad:** Shahar bo‘yicha xizmatlar va bizneslarni birlashtiruvchi platforma — ochiq veb-sahifalar, biznes kabineti, super admin paneli, ta’lim (o‘quv markaz) moduli, Telegram bot va REST API.

---

## Texnologiyalar

| Qatlam | Stack |
|--------|--------|
| Backend | Django 4.2, Django REST Framework, JWT (`djangorestframework-simplejwt`), SQLite (prod ham volume orqali), Gunicorn, Whitenoise, `django-cors-headers` |
| Frontend | React 18, Vite 7, React Router 7, Ant Design, Axios, Recharts |
| Bot | aiogram 3, long polling — `backend/botapp/telegram_bot.py`, `python manage.py run_telegram_bot` |
| Deploy | Docker Compose (`backend` + `frontend` nginx SPA), `deploy/stack.env`, host nginx namunalari |

---

## Foydalanuvchi rollari (`apps.accounts.User`)

| Rol | Vazifasi |
|-----|----------|
| `super_admin` | Platforma boshqaruvi — SPA `/admin/...` |
| `business_owner`, `manager` | Biznes kabineti — `/business/...` |
| `edu_teacher` | Ta’lim portali — `/portal/teacher` |
| `edu_student` | `/portal/student` |
| `edu_parent` | `/portal/parent` |

Kirish: JWT. Ochiq sahifalar token talab qilmaydi.

---

## Asosiy modellar (mantiqiy)

- **Shahar** (`city`) — slug, nom, tavsif.
- **Xizmat kategoriyasi** (`service_categories`) — shahar bilan bog‘langan.
- **Biznes** (`businesses`) — `BusinessType` (o‘quv markaz, restoran, do‘kon, klinika, avtosalon va boshqalar), `Status`, logo, manzil, `telegram_admin_chat_id`, `slug`, `is_featured`.
- **Katalog** (`catalog`) — mahsulot / xizmat / kurs (narx, rasm, holat, slug).
- **Mijozlar** (`customers`) — `TelegramCustomer` (shahar + `telegram_id`).
- **Lidlar, bronlar, buyurtmalar** — `leads`, `bookings`, `orders`; Telegram bildirishnomalar.
- **Ta’lim** — `students`, `teachers`, guruhlar, davomat, baholar/reyting; **edu_quizzes** — testlar va kategoriyalar (REST).
- **Tariflar / billing** — `subscriptions`, `billing`, `invoices`.
- **AI / marketing** — `knowledge` (biznesga bog‘liq bilim bazasi), `analytics` (AI usage), `marketing` (matn generatori).
- **Bot engine** — sessiya, shablon, xabar loglari (`bot_engine`).

---

## REST API (`backend/config/urls.py`)

Barcha API `/api/` ostida (admin alohida: `/admin/`):

`auth`, `city`, `service_categories`, `businesses`, `catalog`, `customers`, `leads`, `bookings`, `orders`, `knowledge`, `bot_engine`, `subscriptions`, `analytics`, `marketing`, `billing`, `teachers`, `students`, `edu_quizzes`.

---

## Frontend marshrutlar (`frontend/src/routes/AppRoutes.jsx`)

- `/login`
- `/portal/teacher`, `/portal/teacher/students/:id`
- `/portal/student`
- `/portal/parent`
- `/admin/` — dashboard, cities, categories, businesses, subscriptions, invoices, analytics, settings
- `/business/` — select, dashboard, items, materials, edu-quizzes, leads, students, student-ratings, student-groups, teachers, bookings, orders, knowledge, managers, ai-usage, marketing, billing, settings
- Ochiq: `/c/:citySlug`, `/c/:citySlug/:categorySlug`, `/b/:businessSlug`
- `/` → `/c/buxoro` ga yo‘naltirish

Productionda API odatda nisbiy `/api/...` — frontend konteyneridagi nginx SPA konfigi backendga proksi qiladi.

---

## README bo‘yicha funksiyalar (qisqa)

### Umumiy
- JWT kirish; rollar yuqorida.
- Ochiq sahifalar: shahar, kategoriya, biznes kartochkasi; Telegram Web App bilan bog‘lash mumkin.

### Super admin (`/admin`)
- Shaharlar, xizmat kategoriyalari, bizneslar moderatsiyasi.
- Tariflar (subscriptions), billing / hisob-fakturalar.
- Platforma analitikasi va sozlamalar.

### Biznes kabineti (`/business`)
- Boshqaruv paneli (biznes turiga qarab dinamik ko‘rsatkichlar).
- Katalog (mahsulot/xizmat/kurs; ta’limda kurs/kitob/mahsulot ajratish; slug).
- Lidlar, bronlar, buyurtmalar.
- Menejerlar, AI bilim bazasi, AI sarfi, marketing generatori (tarifga bog‘liq), billing.

### Ta’lim moduli
- O‘quvchilar, davomat (tarifda `has_edu_attendance`), guruhlar, ustozlar, materiallar.
- **Abonement:** `Student.tuition_paid_until` + `tuition_payment_note` — kabinetda to‘langan / muddati o‘tgan / kiritilmagan; o‘quvchi va ota-ona portalida `Alert` orqali ko‘rinadi.
- Baholar va reyting; portallar uchun login (ustoz/o‘quvchi/ota-ona).
- Davomat o‘zgarganda ota-onaga Telegram (`telegram_id` + `TELEGRAM_BOT_TOKEN`).

### Kabinetlar (`/portal`)
- Ustoz: guruhlar va o‘quvchilar.
- O‘quvchi: profil, davomat, baholar, reyting.
- Ota-ona: farzand, profil, Telegram ID, davomat, baholar, reyting.

### Telegram bot
- Biznes turi bo‘yicha menyu va FSM oqimlari.
- AI yordamchi — OpenAI + knowledge + biznes konteksti (`OPENAI_API_KEY`).
- Web App havolasi (`TELEGRAM_WEB_APP_URL` HTTPS).
- Lid/bron/buyurtma bo‘yicha admin va mijozga xabarlar.

---

## Muhit o‘zgaruvchilari (asosiy)

| O‘zgaruvchi | Vazifasi |
|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Bot (majburiy, bot ishga tushganda) |
| `DJANGO_SECRET_KEY` | Production |
| `OPENAI_API_KEY` | AI yordamchi, marketing va boshqa AI |
| `TELEGRAM_WEB_APP_URL` | Web App (HTTPS, path siz) |

Docker VPS: `deploy/stack.env`. Lokal: loyiha ildizi `.env` va `backend/.env` (`telegram_bot.py` ikkalasini ham o‘qishi mumkin).

---

## Demo ma’lumot

```bash
cd backend && python manage.py seed_demo
```

---

## Deploy (VPS)

- `docker-compose.yml`: frontend `127.0.0.1:8080:80`, host nginx `deploy/nginx-citybot.uz.conf`.
- Yangilanish: `bash deploy/vps-update.sh` yoki `git pull` + `docker-compose build --no-cache` + `up -d --force-recreate`.
- Nginx/sertifikat muammosi: `deploy/vps-recovery.sh`, `nginx-citybot.uz.http-only.conf`.
- Telegram bot fon rejimda: `bash deploy/vps-telegram-bot.sh start` (`stack.env`da token).

---

## Kod joylashuvi (tezkor qidiruv)

| Qism | Yo‘l |
|------|------|
| URL routing | `backend/config/urls.py` |
| Frontend marshrutlar | `frontend/src/routes/AppRoutes.jsx` |
| Bot kirish nuqtasi | `backend/botapp/telegram_bot.py` |
| Bot buyruq | `backend/apps/bot_engine/management/commands/run_telegram_bot.py` |
| API klient | `frontend/src/services/api.js` |

---

*Ushbu fayl loyiha tuzilishi va funksiyalarini boshqa LLM yoki yangi jamoa a’zosiga uzatish uchun yozilgan. Kod o‘zgarganda yangilanishni unutmang.*
