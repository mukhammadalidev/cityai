"""Tugma matnlari (bir xil qator bo‘lishi shart)."""

HOME_BUTTON = "🏠 Bosh menyu (biznes tanlash)"
CHANGE_SALON_BUTTON = "🔄 Boshqa salon tanlash"
ITEMS_LEGACY = "📋 Xizmatlar va narxlar"
ADDRESS_BUTTON = "📍 Manzil va ish vaqti"
OPERATOR_BUTTON = "☎️ Operator bilan bog‘lanish"

R_MENU_BUTTON = "🍔 Menyu"
R_FOOD_ORDER = "🍔 Taom buyurtmasi"
R_BOOK_BUTTON = "🍽 Stol bron qilish"
R_DELIVERY_BUTTON = "🚚 Yetkazib berish"
R_PROMO_BUTTON = "🔥 Aksiyalar"
R_ADDRESS_BUTTON = "📍 Manzil"
R_OPERATOR_BUTTON = "☎️ Operator"

# Avtosalon
AS_CARS = "🚘 Mashinalarni ko‘rish"
AS_SEARCH = "🔎 Mashina qidirish"
AS_CREDIT = "💳 Kredit haqida"
AS_TRADE = "🔁 Trade-in"
AS_TEST = "🧪 Test drive"
AS_ADDR = "📍 Manzil"
AS_OP = "☎️ Operator"

# O‘quv markaz
ED_COURSES = "📚 Kurslarni ko‘rish"
ED_PRICES = "💰 Narxlar"
ED_TRIAL = "🧪 Bepul sinov darsi"
ED_TEACHERS = "👨‍🏫 Ustozlar"
ED_SCHED = "📅 Dars jadvali"
ED_ADDR = "📍 Manzil"
ED_ADMIN = "☎️ Admin"

# Do‘kon
SH_PRODUCTS = "🛍 Mahsulotlarni ko‘rish"
SH_SEARCH = "🔎 Mahsulot qidirish"
SH_ORDER = "🛒 Buyurtma berish"
SH_DEL = "🚚 Yetkazib berish"
SH_PAY = "💳 To‘lov"
SH_OP = "☎️ Operator"

# Klinika
CL_DOCS = "👨‍⚕️ Shifokorlar"
CL_SVC = "🩺 Xizmatlar"
CL_BOOK = "📅 Qabulga yozilish"
CL_PRICE = "💰 Narxlar"
CL_ADDR = "📍 Manzil"
CL_REG = "☎️ Registratura"

# Go‘zallik
BT_SVC = "💇 Xizmatlar"
BT_MAST = "👩‍🎨 Ustalar"
BT_AP = "📅 Navbat olish"
BT_PRICE = "💰 Narxlar"
BT_PROMO = "🔥 Aksiyalar"
BT_ADDR = "📍 Manzil"
BT_ADM = "☎️ Admin"

# Usta
RP_SVC = "🛠 Xizmatlar"
RP_MASTER = "👨‍🔧 Ustalar"
RP_AREA = "📍 Hudud tanlash"
RP_ORDER = "📅 Buyurtma berish"
RP_PRICE = "💰 Narxlar"
RP_OP = "☎️ Operator"

# Ko‘chmas mulk
RE_LIST = "🏠 Uylarni ko‘rish"
RE_SEARCH = "🔎 Uy qidirish"
RE_PRICE = "💰 Narxlar"
RE_AREA = "📍 Hududlar"
RE_AGENT = "☎️ Agent bilan bog‘lanish"
RE_VIEW = "🏠 Uy ko‘rishga yozilish"

# Taxi
TX_TAXI = "🚕 Taxi chaqirish"
TX_DEL = "📦 Yetkazib berish"
TX_PRICE = "💰 Narxlar"
TX_OP = "☎️ Operator"

# Yurist
LG_SVC = "⚖️ Xizmatlar"
LG_BOOK = "📅 Konsultatsiyaga yozilish"
LG_PRICE = "💰 Narxlar"
LG_CALL = "☎️ Yurist bilan bog‘lanish"

# Foto
PH_SVC = "📸 Xizmatlar"
PH_PORT = "🎬 Portfolio"
PH_ORD = "📅 Buyurtma berish"
PH_PRICE = "💰 Narxlar"
PH_OP = "☎️ Operator"

# Fitness zal (fitness_center)
FZ_ABON = "🏋️ Abonementlar"
FZ_TRAINERS = "👨‍🏫 Trenerlar"
FZ_TRIAL = "🧪 Bepul sinov mashg‘ulot"
FZ_SCHED = "📅 Mashg‘ulot jadvali"
FZ_PRICE = "💰 Narxlar"
FZ_ADDR = "📍 Manzil"
FZ_ADM = "☎️ Admin bilan bog‘lanish"

# Sun’iy intellekt (Telegram bot)
AI_ASSIST_BUTTON = "🤖 AI yordamchi"

# Tugma matni bo‘lgan barcha konstantalar (AI rejimidan chiqish uchun solishtirish)
ALL_REPLY_MENU_LABELS = frozenset(
    v
    for k, v in globals().items()
    if k.isupper() and isinstance(v, str) and k != "AI_ASSIST_BUTTON"
)
