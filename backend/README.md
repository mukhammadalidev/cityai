# Backend — City Services AI

## Ilovalar (`apps.*`)

| App | Vazifasi |
|-----|----------|
| accounts | Foydalanuvchi rollari: super_admin, business_owner, manager |
| city | Shaharlar |
| service_categories | Shahar xizmat kategoriyalari |
| businesses | Provayderlar, BusinessManager |
| catalog | Item, ItemImage |
| customers | TelegramCustomer (shahar + telegram_id) |
| leads | CRM leadlar |
| bookings | Bronlar |
| orders | Buyurtmalar |
| knowledge | AI bilim bazasi |
| bot_engine | BotTemplate, BotSession, BotMessageLog |
| subscriptions | Tariflar va obunalar |
| analytics | AIUsage, platform/biznes analitikasi |
| marketing | Marketing kontent (demo generator) |
| billing | Hisob-fakturalar |
| attendance | Hikvision FaceID avtomatik davomat (`Attendance`), webhook |

## API (qisqacha)

- `POST /api/auth/login/`, `GET /api/auth/me/`
- `GET/POST /api/cities/`
- `GET /api/service-categories/?city_id=`
- `GET /api/businesses/?city_id=&category_id=`, `GET /api/businesses/slug/{slug}/`
- `GET /api/items/?business_id=`
- `GET/POST /api/leads/` (yaratish ochiq — bot uchun)
- `GET /api/analytics/platform/`, `GET /api/analytics/business/{id}/`
- `GET /api/category-types/`
- `POST /api/attendance/hikvision/event/` — Hikvision listener (FaceID) webhook; `AllowAny`, ixtiyoriy `X-Hikvision-Secret`

To‘liq ro‘yxat uchun `config/urls.py` ni ko‘ring.
