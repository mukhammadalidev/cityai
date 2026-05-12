import random
from collections import defaultdict
from datetime import date, timedelta, time
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.analytics.models import AIUsage
from apps.billing.models import Invoice
from apps.bookings.models import Booking
from apps.bot_engine.models import BotTemplate
from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.city.models import City
from apps.customers.models import TelegramCustomer
from apps.knowledge.models import KnowledgeBase
from apps.leads.models import Lead
from apps.memberships.models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
)
from apps.orders.models import Order, OrderItem
from apps.service_categories.models import ServiceCategory
from apps.students.demo_data import DEMO_STUDENTS
from apps.students.models import Student, StudentGroup
from apps.teachers.models import Teacher
from apps.subscriptions.models import BusinessSubscription, SubscriptionPlan

User = get_user_model()

def _demo_item_title_metadata_description(business_type: str, idx: int) -> tuple[str, dict, str]:
    """Kategoriya turiga mos demo item: sarlavha, metadata (DynamicItemCard / bot uchun), qisqa tavsif."""
    i = idx
    ct = business_type

    if ct == ServiceCategory.CategoryType.AUTO_SALON:
        brands = ["Chevrolet", "BYD", "Hyundai", "Kia", "Chery"]
        models_l = ["Tracker", "Song Plus", "Tucson", "Sportage", "Tiggo 8"]
        brand, model = brands[i % len(brands)], models_l[i % len(models_l)]
        year = 2022 + (i % 4)
        meta = {
            "brand": brand,
            "model": model,
            "year": year,
            "mileage": 8000 + i * 400,
            "fuel_type": "Elektr" if i % 3 == 0 else "Benzin",
            "transmission": "Avtomat",
            "color": ["Oq", "Kulrang", "Qora"][i % 3],
            "condition": "yangi" if i % 4 == 0 else "ishlatilgan",
        }
        title = f"{brand} {model} {year}"
        desc = f"{meta['condition'].title()} avto, {meta['mileage']:,} km, {meta['fuel_type']}.".replace(",", " ")

    elif ct == ServiceCategory.CategoryType.EDUCATION_CENTER:
        courses = [
            "Ingliz tili A2",
            "Frontend dasturlash",
            "Matematika tayyorlov",
            "IELTS intensive",
            "1C buxgalteriya",
            "Grafik dizayn",
        ]
        cname = courses[i % len(courses)]
        meta = {
            "duration": f"{2 + (i % 4)} oy",
            "level": ["Boshlang‘ich", "O‘rta", "Yuqori"][i % 3],
            "teacher": ["Aliyeva M.", "Karimov J.", "Tursunov A."][i % 3],
            "lesson_days": "Du, Chor, Juma",
            "lesson_time": f"{17 + (i % 3)}:00",
            "format": "Online + oflayn" if i % 2 == 0 else "Oflayn",
        }
        title = f"{cname} — guruh {i % 5 + 1}"
        desc = f"{meta['duration']} davomida, {meta['level']} daraja. O‘qituvchi: {meta['teacher']}."

    elif ct == ServiceCategory.CategoryType.SHOP:
        products = [
            "Smartfon Samsung Galaxy",
            "Noutbuk Lenovo IdeaPad",
            "Televizor LG 55",
            "Konditsioner",
            "Mikroto‘lqinli pech",
        ]
        title = f"{products[i % len(products)]} #{i + 1}"
        meta = {
            "stock": 3 + (i % 35),
            "discount": f"{(i % 5) * 5}%" if i % 5 else None,
            "brand": ["Samsung", "LG", "Artel"][i % 3],
        }
        desc = "Kafolat va yetkazib berish shahar bo‘ylab."

    elif ct == ServiceCategory.CategoryType.RESTAURANT:
        dishes = ["Osh maxsus", "Gril set", "Lag‘mon oilaviy", "Shashlik assorti", "Fast lunch kombo"]
        title = dishes[i % len(dishes)]
        meta = {
            "ingredients": "Go‘sht, sabzavot, ziravor",
            "preparation_time": f"{15 + (i % 25)} daq",
            "is_spicy": i % 4 == 0,
            "category": "Asosiy taom",
        }
        desc = f"Tayyorlash ~{meta['preparation_time']}. Yangi va mazali."

    elif ct == ServiceCategory.CategoryType.CLINIC:
        specs = ["Terapevt", "Stomatolog", "LOR", "Kardiolog", "Pediatr"]
        title = f"{specs[i % len(specs)]} qabuli — navbat {i % 8 + 1}"
        meta = {
            "doctor_name": f"Dr. {['Karimova', 'Nazarov', 'Saidova'][i % 3]}",
            "specialty": specs[i % len(specs)],
            "duration": "30 daq",
            "available_days": "Dush–Juma",
            "consultation_price": str(150_000 + i * 5_000),
        }
        desc = "Oldindan yozilish tavsiya etiladi."

    elif ct == ServiceCategory.CategoryType.BEAUTY_SALON:
        services = ["Soch kesish + styling", "Manikyur / pedikyur", "Kosmetolog maslahati", "Chim yuvish"]
        title = services[i % len(services)]
        meta = {
            "master_name": ["Dilnoza", "Madina", "Shahnoza"][i % 3],
            "duration": "45–90 daq",
            "service_type": "Asosiy xizmat",
            "available_days": "Har kuni",
        }
        desc = "Sifatli kosmetika va qulay muhit."

    elif ct == ServiceCategory.CategoryType.REPAIR_SERVICE:
        jobs = ["Uy elektriki", "Konditsioner montaj", "Santexnika", "Mebel yig‘ish", "Bo‘yoq ishlari"]
        title = jobs[i % len(jobs)]
        meta = {
            "master_name": "Usta / mutaxassis",
            "duration": "1–3 soat",
            "service_type": "Uyga chiqish",
            "available_days": "Dush–Yakshanba",
        }
        desc = "Bepul diagnostika, kafolat bilan."

    elif ct == ServiceCategory.CategoryType.REAL_ESTATE:
        title = f"{'Kvartira' if i % 2 else 'Uy'} — {2 + (i % 4)} xona, {45 + i * 3} m²"
        meta = {
            "property_type": "Kvartira" if i % 2 else "Uy",
            "rooms": 2 + (i % 4),
            "area": 45 + i * 3,
            "floor": (i % 9) + 1,
            "rent_or_sale": "ijara" if i % 3 == 0 else "sotuv",
            "has_furniture": i % 3 == 0,
        }
        desc = f"{meta['rent_or_sale'].title()}, {meta['area']} m²."

    elif ct == ServiceCategory.CategoryType.TAXI_DELIVERY:
        title = f"Shahar ichida yetkazish — paket #{i + 1}"
        meta = {
            "delivery_radius": "15 km",
            "vehicle_type": ["Yengil avto", "Miniven"][i % 2],
            "eta": f"{15 + (i % 20)} daq",
        }
        desc = "Tezkor kuryer, kuzatuv SMS."

    elif ct == ServiceCategory.CategoryType.FITNESS:
        title = ["Abonement oylik", "Shaxsiy murabbiy 10 dars", "Zal bir martalik", "Yoga guruh"][i % 4]
        meta = {
            "duration": "1 oy",
            "level": "Barcha darajalar",
            "format": "Zal + kardio",
            "lesson_time": "Ertalab / kechqurun",
        }
        desc = "Zamonaviy jihozlar va dush xonalari."

    elif ct == ServiceCategory.CategoryType.FITNESS_CENTER:
        presets = [
            {
                "title": "1 oylik abonement",
                "duration": "1 oy",
                "sessions_count": 12,
                "trainer_name": "Aliyev Jasur",
                "training_type": "Fitness",
                "schedule": "Dushanba, Chorshanba, Juma — 18:00",
                "level": "Beginner",
                "gender_group": "Aralash",
            },
            {
                "title": "3 oylik abonement",
                "duration": "3 oy",
                "sessions_count": 36,
                "trainer_name": "Akmal Tojiyev",
                "training_type": "Fitness",
                "schedule": "Har kuni — 17:00",
                "level": "Intermediate",
                "gender_group": "Aralash",
            },
            {
                "title": "Personal trener paketi",
                "duration": "1 oy",
                "sessions_count": 12,
                "trainer_name": "Sardor Olimov",
                "training_type": "Personal training",
                "schedule": "Kelishilgan holda",
                "level": "Advanced",
                "gender_group": "Erkaklar",
                "has_personal_trainer": True,
            },
            {
                "title": "Yoga guruh — 8 dars",
                "duration": "1 oy",
                "sessions_count": 8,
                "trainer_name": "Mavluda Karimova",
                "training_type": "Yoga",
                "schedule": "Seshanba, Payshanba — 08:00",
                "level": "Beginner",
                "gender_group": "Ayollar",
            },
            {
                "title": "Crossfit kuchli kurs",
                "duration": "2 oy",
                "sessions_count": 24,
                "trainer_name": "Aliyev Jasur",
                "training_type": "Crossfit",
                "schedule": "Seshanba, Payshanba, Shanba — 19:00",
                "level": "Intermediate",
                "gender_group": "Aralash",
            },
        ]
        preset = presets[i % len(presets)]
        title = preset["title"]
        meta = {
            "duration": preset["duration"],
            "sessions_count": preset["sessions_count"],
            "trainer_name": preset["trainer_name"],
            "training_type": preset["training_type"],
            "schedule": preset["schedule"],
            "level": preset["level"],
            "gender_group": preset["gender_group"],
            "has_personal_trainer": preset.get("has_personal_trainer", False),
            "available": True,
        }
        desc = f"{preset['duration']}, {preset['sessions_count']} mashg‘ulot. Trener: {preset['trainer_name']}."

    elif ct == ServiceCategory.CategoryType.LEGAL_SERVICE:
        title = ["Mehnat huquqi maslahati", "Shartnoma tekshiruvi", "Fuqarolik ishi"][i % 3]
        meta = {
            "duration": "60 daq",
            "format": "Ofis / onlayn",
            "specialty": "Fuqarolik ishlar",
        }
        desc = "Birinchi konsultatsiya qisqa va bepul (aksiya)."

    elif ct == ServiceCategory.CategoryType.PHOTO_VIDEO:
        title = ["To‘y suratga olish", "Mahsulot fotosesiya", "Reklama rolik 30s"][i % 3]
        meta = {
            "duration": "3–8 soat",
            "format": "Studiya + lokatsiya",
            "delivery_time": "7 kun ichida",
        }
        desc = "Professional muaalliflik va rang tuzatish."

    else:
        title = f"Xizmat #{i + 1} ({business_type})"
        meta = {"category_note": "Umumiy xizmat", "idx": i}
        desc = "Demo pozitsiya. Batafsil admin panel orqali."

    meta = {**meta, "demo": True, "business_type": business_type}
    return title, meta, desc


CATEGORY_DEFS = [
    ("🚘 Avtosalon", ServiceCategory.CategoryType.AUTO_SALON),
    ("📚 O‘quv markaz", ServiceCategory.CategoryType.EDUCATION_CENTER),
    ("🛍 Do‘kon", ServiceCategory.CategoryType.SHOP),
    ("🍔 Restoran", ServiceCategory.CategoryType.RESTAURANT),
    ("🏥 Klinika", ServiceCategory.CategoryType.CLINIC),
    ("💇 Go‘zallik saloni", ServiceCategory.CategoryType.BEAUTY_SALON),
    ("🛠 Usta xizmatlari", ServiceCategory.CategoryType.REPAIR_SERVICE),
    ("🏠 Uy-joy", ServiceCategory.CategoryType.REAL_ESTATE),
    ("🚕 Taxi / yetkazib berish", ServiceCategory.CategoryType.TAXI_DELIVERY),
    ("🏋️ Fitnes", ServiceCategory.CategoryType.FITNESS),
    ("🏋️ Fitness zal", ServiceCategory.CategoryType.FITNESS_CENTER),
    ("⚖️ Yuridik xizmat", ServiceCategory.CategoryType.LEGAL_SERVICE),
    ("📷 Foto / video", ServiceCategory.CategoryType.PHOTO_VIDEO),
]

FITNESS_CENTER_DEMO_BUSINESSES = [
    "Energy Fitness Buxoro",
    "Power Gym",
    "FitLife Sport Club",
]

FITNESS_CENTER_DEMO_ITEMS = [
    {
        "title": "1 oylik abonement",
        "price": 250_000,
        "duration": "1 oy",
        "sessions_count": 12,
        "trainer_name": "Aliyev Jasur",
        "training_type": "Fitness",
        "schedule": "Dushanba, Chorshanba, Juma — 18:00",
        "level": "Beginner",
        "gender_group": "Aralash",
    },
    {
        "title": "3 oylik abonement",
        "price": 650_000,
        "duration": "3 oy",
        "sessions_count": 36,
        "trainer_name": "Akmal Tojiyev",
        "training_type": "Fitness",
        "schedule": "Har kuni — 17:00",
        "level": "Intermediate",
        "gender_group": "Aralash",
    },
    {
        "title": "Personal trener paketi",
        "price": 1_200_000,
        "duration": "1 oy",
        "sessions_count": 12,
        "trainer_name": "Sardor Olimov",
        "training_type": "Personal training",
        "schedule": "Kelishilgan holda",
        "level": "Advanced",
        "gender_group": "Erkaklar",
        "has_personal_trainer": True,
    },
]


class Command(BaseCommand):
    help = "City Services AI Platform — demo ma’lumotlari (Buxoro, kategoriyalar, bizneslar, leadlar)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Barcha jadvallarni tozalab, keyin seed qiladi (migrate allaqachon bajarilgan bo‘lishi kerak).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            call_command("flush", interactive=False, verbosity=0)
        elif City.objects.filter(slug="buxoro").exists():
            self.stdout.write(
                self.style.WARNING(
                    "Demo ma'lumot allaqachon mavjud. Qayta yuklash: python manage.py seed_demo --clear"
                )
            )
            return

        admin = User.objects.create_user(
            username="admin",
            password="admin12345",
            role=User.Role.SUPER_ADMIN,
            full_name="Platforma admini",
            is_staff=True,
            is_superuser=True,
        )
        owners = []
        for i in range(10):
            u = User.objects.create_user(
                username=f"biznes{i}",
                password="demo12345",
                role=User.Role.BUSINESS_OWNER,
                full_name=f"Biznes egasi {i + 1}",
                phone=f"+998901234{i:03d}",
            )
            owners.append(u)

        # Tariflar: demo → start → business → premium.
        # Tuple: name, code, monthly, setup, max_items, max_managers, max_leads/mo, max_ai/mo,
        #        ai_chat, analytics, public_page, marketing, auto_followup, white_label,
        #        edu_attendance, edu_materials, edu_portals, trial_days (0 = sinovsiz; demo = 7 kun)
        plans = [
            (
                "Demo",
                SubscriptionPlan.Code.DEMO,
                0,
                0,
                20,
                1,
                100,
                250,
                True,
                False,
                True,
                False,
                False,
                False,
                True,
                True,
                True,
                7,
            ),
            (
                "Start",
                SubscriptionPlan.Code.START,
                149_000,
                0,
                120,
                4,
                1_500,
                4_000,
                True,
                False,
                True,
                False,
                False,
                False,
                True,
                True,
                True,
                0,
            ),
            (
                "Business",
                SubscriptionPlan.Code.BUSINESS,
                399_000,
                0,
                500,
                12,
                8_000,
                15_000,
                True,
                True,
                True,
                True,
                True,
                False,
                True,
                True,
                True,
                0,
            ),
            (
                "Premium",
                SubscriptionPlan.Code.PREMIUM,
                799_000,
                0,
                20_000,
                80,
                100_000,
                100_000,
                True,
                True,
                True,
                True,
                True,
                True,
                True,
                True,
                True,
                0,
            ),
        ]
        plan_objs = []
        for name, code, mprice, sprice, mi, mm, ml, ma, ai, an, pub, mk, af, wl, ed_a, ed_m, ed_p, trial_days in plans:
            plan_objs.append(
                SubscriptionPlan.objects.create(
                    name=name,
                    code=code,
                    monthly_price=Decimal(mprice),
                    setup_price=Decimal(sprice),
                    max_items=mi,
                    max_managers=mm,
                    max_leads_per_month=ml,
                    max_ai_messages_per_month=ma,
                    has_ai_chat=ai,
                    has_analytics=an,
                    has_public_page=pub,
                    has_marketing_generator=mk,
                    has_auto_followup=af,
                    has_white_label=wl,
                    has_edu_attendance=ed_a,
                    has_edu_materials=ed_m,
                    has_edu_portals=ed_p,
                    trial_days=trial_days,
                    parent_can_create_student_portal=(code == SubscriptionPlan.Code.PREMIUM),
                )
            )
        demo_plan = plan_objs[0]

        city = City.objects.create(
            name="Buxoro",
            region="Buxoro viloyati",
            description="Qadimiy shahar — barcha xizmatlar bitta botda.",
            is_active=True,
        )

        categories = []
        for sort, (label, ctype) in enumerate(CATEGORY_DEFS):
            categories.append(
                ServiceCategory.objects.create(
                    city=city,
                    name=label.split(" ", 1)[-1].strip(),
                    icon=label.split()[0],
                    description=f"{label} — demo kategoriya.",
                    category_type=ctype,
                    sort_order=sort,
                )
            )

        businesses = []
        for i in range(30):
            cat = categories[i % len(categories)]
            b = Business.objects.create(
                owner=owners[i % len(owners)],
                city=city,
                category=cat,
                name=f"{cat.name} #{i + 1} — demo",
                business_type=cat.category_type,
                description="Demo biznes profili. Manzil va telefon namuna.",
                phone=f"+99890{random.randint(1000000, 9999999)}",
                address=f"Buxoro, ko‘cha {i + 1}",
                working_hours="09:00 – 20:00",
                telegram_admin_chat_id="",
                status=Business.Status.ACTIVE,
                is_featured=(i < 5),
                rating=Decimal(f"{3 + random.random() * 2:.2f}"),
            )
            businesses.append(b)
            d0 = date.today()
            BusinessSubscription.objects.create(
                business=b,
                plan=demo_plan,
                status=BusinessSubscription.Status.TRIAL,
                start_date=d0,
                end_date=d0 + timedelta(days=demo_plan.trial_days or 7),
                next_payment_date=d0 + timedelta(days=demo_plan.trial_days or 7),
            )
            Invoice.objects.create(
                business=b,
                amount=demo_plan.monthly_price,
                invoice_type=Invoice.InvoiceType.MONTHLY,
                status=Invoice.Status.PAID if i % 3 else Invoice.Status.UNPAID,
                due_date=date.today() + timedelta(days=14),
            )

        items = []
        _item_seq_by_business: dict[int, int] = defaultdict(int)
        for i in range(150):
            b = businesses[i % len(businesses)]
            seq = _item_seq_by_business[b.pk]
            _item_seq_by_business[b.pk] = seq + 1
            title, meta, desc = _demo_item_title_metadata_description(b.business_type, seq)
            items.append(
                Item.objects.create(
                    business=b,
                    title=title,
                    slug=f"demo-item-{b.pk}-{seq}",
                    category_name=b.category.name,
                    price=Decimal(random.randint(50_000, 500_000_000)),
                    currency="UZS",
                    description=desc,
                    status=Item.Status.ACTIVE,
                    metadata=meta,
                )
            )

        customers = []
        for i in range(100):
            customers.append(
                TelegramCustomer(
                    city=city,
                    telegram_id=str(100000 + i),
                    username=f"user{i}",
                    first_name=f"Mijoz{i}",
                    phone=f"+998{random.randint(900000000, 999999999)}",
                )
            )
        TelegramCustomer.objects.bulk_create(customers)
        customers = list(TelegramCustomer.objects.filter(city=city))

        leads = []
        for i in range(200):
            b = businesses[i % len(businesses)]
            c = customers[i % len(customers)]
            it = items[i % len(items)] if items else None
            leads.append(
                Lead(
                    city=city,
                    business=b,
                    customer=c,
                    item=it if i % 2 == 0 else None,
                    category=b.category,
                    lead_type=Lead.LeadType.CONTACT,
                    name=c.first_name or f"Lead {i}",
                    phone=c.phone or "+998900000000",
                    message="Salom, narx haqida so‘ramoqchiman.",
                    status=random.choice(list(Lead.Status)),
                    source=Lead.Source.TELEGRAM_BOT,
                )
            )
        Lead.objects.bulk_create(leads)

        bookings = []
        for i in range(50):
            b = businesses[i % len(businesses)]
            c = customers[i % len(customers)]
            bookings.append(
                Booking(
                    city=city,
                    business=b,
                    customer=c,
                    item=items[i % len(items)] if items else None,
                    booking_type=random.choice(list(Booking.BookingType)),
                    name=c.first_name,
                    phone=c.phone,
                    preferred_date=date.today() + timedelta(days=random.randint(1, 20)),
                    preferred_time=time(10, 0),
                    status=Booking.Status.NEW,
                )
            )
        Booking.objects.bulk_create(bookings)

        for i in range(50):
            b = businesses[i % len(businesses)]
            c = customers[i % len(customers)]
            order = Order.objects.create(
                city=city,
                business=b,
                customer=c,
                name=c.first_name,
                phone=c.phone,
                address="Buxoro",
                total_amount=Decimal(0),
                status=Order.Status.NEW,
            )
            it = items[i % len(items)]
            qty = random.randint(1, 3)
            price = it.price
            total = price * qty
            OrderItem.objects.create(order=order, item=it, quantity=qty, price=price, total=total)
            order.total_amount = total
            order.save(update_fields=["total_amount"])

        default_menu = {
            "buttons": [
                ["📋 Xizmatlarni ko‘rish"],
                ["📍 Manzil", "☎️ Telefon qoldirish"],
                ["❓ Savol berish"],
                ["🏠 Bosh menyuga"],
            ]
        }
        for ctype, _ in CATEGORY_DEFS[:8]:
            BotTemplate.objects.get_or_create(
                category_type=ctype,
                name="default",
                defaults={
                    "menu_config": default_menu,
                    "field_config": {},
                    "prompt_template": "Siz shahar xizmatlari yordamchisisiz.",
                    "lead_types": ["contact"],
                    "booking_enabled": True,
                    "order_enabled": False,
                },
            )

        fitness_center_menu = {
            "buttons": [
                ["🏋️ Abonementlar", "👨‍🏫 Trenerlar"],
                ["🧪 Bepul sinov mashg‘ulot", "📅 Mashg‘ulot jadvali"],
                ["💰 Narxlar", "📍 Manzil"],
                ["☎️ Admin bilan bog‘lanish"],
            ]
        }
        fitness_field_config = {
            "fields": [
                {"name": "duration", "label": "Davomiyligi", "type": "input"},
                {"name": "sessions_count", "label": "Mashg‘ulotlar soni", "type": "number"},
                {"name": "trainer_name", "label": "Trener", "type": "input"},
                {
                    "name": "training_type",
                    "label": "Mashg‘ulot turi",
                    "type": "select",
                    "options": [
                        "Fitness",
                        "Bodybuilding",
                        "Crossfit",
                        "Yoga",
                        "Cardio",
                        "Personal training",
                        "Group training",
                    ],
                },
                {"name": "schedule", "label": "Jadval", "type": "input"},
                {
                    "name": "level",
                    "label": "Daraja",
                    "type": "select",
                    "options": ["Beginner", "Intermediate", "Advanced"],
                },
                {
                    "name": "gender_group",
                    "label": "Guruh turi",
                    "type": "select",
                    "options": ["Erkaklar", "Ayollar", "Aralash"],
                },
                {"name": "has_personal_trainer", "label": "Personal trener bormi?", "type": "switch"},
                {"name": "available", "label": "Mavjudmi?", "type": "switch"},
            ]
        }
        BotTemplate.objects.get_or_create(
            category_type=ServiceCategory.CategoryType.FITNESS_CENTER,
            name="default",
            defaults={
                "menu_config": fitness_center_menu,
                "field_config": fitness_field_config,
                "prompt_template": (
                    "Siz Fitness zal yordamchisisiz. Abonement narxlari, mashg‘ulot jadvali, "
                    "trenerlar, manzil, ish vaqti haqida o‘zbek tilida qisqa javob bering. "
                    "Tibbiy maslahat bermang, vazn yo‘qotish/mushak hosil bo‘lishini kafolatlamang. "
                    "Salomatlik savoli bo‘lsa shifokor yoki professional trener bilan maslahatlashishni tavsiya qiling."
                ),
                "lead_types": ["membership_request", "price_question", "contact"],
                "booking_enabled": True,
                "order_enabled": False,
            },
        )

        fitness_center_cat = next(
            (c for c in categories if c.category_type == ServiceCategory.CategoryType.FITNESS_CENTER),
            None,
        )
        if fitness_center_cat:
            fc_businesses: list[Business] = []
            for idx, fz_name in enumerate(FITNESS_CENTER_DEMO_BUSINESSES):
                fz_owner = owners[(idx + 7) % len(owners)]
                fz = Business.objects.create(
                    owner=fz_owner,
                    city=city,
                    category=fitness_center_cat,
                    name=fz_name,
                    business_type=Business.BusinessType.FITNESS_CENTER,
                    description=(
                        f"{fz_name} — Buxorodagi zamonaviy fitness zal. "
                        "Abonement, personal trener va guruh mashg‘ulotlari."
                    ),
                    phone=f"+99890{random.randint(1000000, 9999999)}",
                    address=f"Buxoro, Fitness ko‘chasi {idx + 1}",
                    working_hours="07:00 – 22:00",
                    telegram_admin_chat_id="",
                    status=Business.Status.ACTIVE,
                    is_featured=(idx == 0),
                    rating=Decimal(f"{4 + random.random():.2f}"),
                )
                fc_businesses.append(fz)
                d0 = date.today()
                BusinessSubscription.objects.create(
                    business=fz,
                    plan=demo_plan,
                    status=BusinessSubscription.Status.TRIAL,
                    start_date=d0,
                    end_date=d0 + timedelta(days=demo_plan.trial_days or 7),
                    next_payment_date=d0 + timedelta(days=demo_plan.trial_days or 7),
                )
                Invoice.objects.create(
                    business=fz,
                    amount=demo_plan.monthly_price,
                    invoice_type=Invoice.InvoiceType.MONTHLY,
                    status=Invoice.Status.UNPAID,
                    due_date=date.today() + timedelta(days=14),
                )

            fc_items: list[Item] = []
            for fz in fc_businesses:
                for seq, preset in enumerate(FITNESS_CENTER_DEMO_ITEMS):
                    meta = {
                        "duration": preset["duration"],
                        "sessions_count": preset["sessions_count"],
                        "trainer_name": preset["trainer_name"],
                        "training_type": preset["training_type"],
                        "schedule": preset["schedule"],
                        "level": preset["level"],
                        "gender_group": preset["gender_group"],
                        "has_personal_trainer": preset.get("has_personal_trainer", False),
                        "available": True,
                        "demo": True,
                        "business_type": Business.BusinessType.FITNESS_CENTER,
                    }
                    it = Item.objects.create(
                        business=fz,
                        title=preset["title"],
                        slug=f"fz-{fz.pk}-{seq}",
                        category_name="Abonementlar",
                        price=Decimal(preset["price"]),
                        currency="UZS",
                        description=(
                            f"{preset['duration']}, {preset['sessions_count']} mashg‘ulot, "
                            f"trener: {preset['trainer_name']}."
                        ),
                        status=Item.Status.ACTIVE,
                        metadata=meta,
                    )
                    fc_items.append(it)

            fc_customers = customers[:6] if len(customers) >= 6 else customers
            for idx, fz in enumerate(fc_businesses):
                fz_items = [i for i in fc_items if i.business_id == fz.id]
                if not fz_items or not fc_customers:
                    continue
                # Membership lead namunalari
                for k in range(2):
                    cust = fc_customers[(idx * 2 + k) % len(fc_customers)]
                    item = fz_items[k % len(fz_items)]
                    Lead.objects.create(
                        city=city,
                        business=fz,
                        customer=cust,
                        item=item,
                        category=fitness_center_cat,
                        lead_type=Lead.LeadType.MEMBERSHIP_REQUEST,
                        name=cust.first_name or f"Mijoz {k + 1}",
                        phone=cust.phone or "+998900000000",
                        message="Abonement haqida ma'lumot kerak.",
                        status=Lead.Status.NEW if k % 2 == 0 else Lead.Status.CONTACTED,
                        source=Lead.Source.TELEGRAM_BOT,
                        metadata={
                            "preferred_start_date": (date.today() + timedelta(days=3 + k)).isoformat(),
                            "preferred_time": "18:00",
                        },
                    )
                # Price question lead namunalari
                cust2 = fc_customers[(idx * 2 + 4) % len(fc_customers)]
                Lead.objects.create(
                    city=city,
                    business=fz,
                    customer=cust2,
                    item=fz_items[0],
                    category=fitness_center_cat,
                    lead_type=Lead.LeadType.PRICE_QUESTION,
                    name=cust2.first_name or "Mijoz",
                    phone=cust2.phone or "+998900000000",
                    message="Personal trener narxi qancha?",
                    status=Lead.Status.NEW,
                    source=Lead.Source.TELEGRAM_BOT,
                )
                # Trial mashg‘ulot booking
                cust3 = fc_customers[(idx * 2 + 1) % len(fc_customers)]
                Booking.objects.create(
                    city=city,
                    business=fz,
                    customer=cust3,
                    item=fz_items[0],
                    booking_type=Booking.BookingType.TRIAL_LESSON,
                    name=cust3.first_name or "Mijoz",
                    phone=cust3.phone or "+998900000000",
                    preferred_date=date.today() + timedelta(days=2),
                    preferred_time=time(18, 0),
                    note="Bepul sinov mashg‘ulot",
                    status=Booking.Status.NEW,
                    metadata={"training_type": "Fitness", "source": "fitness_trial"},
                )

            # Fitness ledger: kunlik va oylik klientlar, abonementlar, to'lovlar, davomat
            monthly_demo_names = [
                ("Akmal Rashidov", "+998901001001", "male"),
                ("Dilshoda Karimova", "+998901001002", "female"),
                ("Sardor Sobirov", "+998901001003", "male"),
                ("Nigora Tursunova", "+998901001004", "female"),
                ("Bekzod Yusupov", "+998901001005", "male"),
                ("Madina Saidova", "+998901001006", "female"),
                ("Javohir Toshmatov", "+998901001007", "male"),
                ("Shahnoza Rahimova", "+998901001008", "female"),
                ("Aziz Norqulov", "+998901001009", "male"),
                ("Ozoda Boboyeva", "+998901001010", "female"),
            ]
            daily_demo_names = [
                ("Rustam Aliyev", "+998901002001", "male"),
                ("Gulnora Mirzayeva", "+998901002002", "female"),
                ("Ulug‘bek Pardayev", "+998901002003", "male"),
                ("Zarina Holmatova", "+998901002004", "female"),
                ("Ravshan Otaboyev", "+998901002005", "male"),
            ]
            today_d = date.today()
            for fz_idx, fz in enumerate(fc_businesses):
                fz_items = [i for i in fc_items if i.business_id == fz.id]
                if not fz_items:
                    continue
                # Oylik klientlar
                for ci, (cname, cphone, cgender) in enumerate(monthly_demo_names):
                    client = BusinessClient.objects.create(
                        business=fz,
                        full_name=cname,
                        phone=cphone,
                        gender=cgender,
                        client_type=BusinessClient.ClientType.MONTHLY,
                        status=BusinessClient.Status.ACTIVE,
                        note="Demo (seed_demo)",
                    )
                    item = fz_items[ci % len(fz_items)]
                    start = today_d - timedelta(days=20 - ci)
                    end = start + timedelta(days=30)
                    expected = item.price or Decimal("500000")
                    if ci % 3 == 0:
                        paid = Decimal("0")
                        pstatus = ClientMembership.PaymentStatus.UNPAID
                    elif ci % 3 == 1:
                        paid = expected / Decimal("2")
                        pstatus = ClientMembership.PaymentStatus.PARTIAL
                    else:
                        paid = expected
                        pstatus = ClientMembership.PaymentStatus.PAID
                    membership = ClientMembership.objects.create(
                        business=fz,
                        client=client,
                        item=item,
                        title=item.title,
                        start_date=start,
                        end_date=end,
                        expected_amount=expected,
                        paid_amount=paid,
                        currency=item.currency or "UZS",
                        sessions_total=int(item.metadata.get("sessions_count") or 0) if isinstance(item.metadata, dict) else 0,
                        status=ClientMembership.Status.ACTIVE,
                        payment_status=pstatus,
                        note="Demo abonement",
                    )
                    if paid > 0:
                        ClientPayment.objects.create(
                            business=fz,
                            client=client,
                            membership=membership,
                            amount=paid,
                            currency=item.currency or "UZS",
                            payment_date=start,
                            method=ClientPayment.Method.CASH if ci % 2 == 0 else ClientPayment.Method.CARD,
                            note="Demo to'lov",
                        )
                    # Demo: birinchi fitness biznesining birinchi klientiga portal kabineti
                    if fz_idx == 0 and ci == 0:
                        client.announcement = (
                            "Salom! Sizning abonementingiz faol. Tashrif vaqti: har kuni 18:00. "
                            "Savolingiz bo'lsa, administratorga murojaat qiling."
                        )
                        client.save(update_fields=["announcement"])
                        portal_username = "klient_demo"
                        if not User.objects.filter(username=portal_username).exists():
                            portal_user = User.objects.create_user(
                                username=portal_username,
                                password="demo12345",
                                role=User.Role.BUSINESS_CLIENT,
                                full_name=client.full_name,
                                phone=client.phone or "",
                            )
                            portal_user.portal_business_client = client
                            portal_user.save(update_fields=["portal_business_client"])
                    # Davomat — oxirgi 14 kunda 4-7 ta tashrif
                    visits = 4 + (ci % 4)
                    for v in range(visits):
                        vd = today_d - timedelta(days=v * 2)
                        ClientAttendance.objects.create(
                            business=fz,
                            client=client,
                            membership=membership,
                            visit_date=vd,
                            visit_time=time(18, 0),
                            client_type=BusinessClient.ClientType.MONTHLY,
                            amount_charged=Decimal("0"),
                            note="Demo tashrif",
                        )
                # Kunlik klientlar
                daily_price = Decimal("30000")
                for ci, (cname, cphone, cgender) in enumerate(daily_demo_names):
                    client = BusinessClient.objects.create(
                        business=fz,
                        full_name=cname,
                        phone=cphone,
                        gender=cgender,
                        client_type=BusinessClient.ClientType.DAILY,
                        status=BusinessClient.Status.ACTIVE,
                        note="Demo (kunlik)",
                    )
                    visits = 2 + (ci % 3)
                    for v in range(visits):
                        vd = today_d - timedelta(days=v)
                        amount = daily_price
                        ClientAttendance.objects.create(
                            business=fz,
                            client=client,
                            visit_date=vd,
                            visit_time=time(19, 30),
                            client_type=BusinessClient.ClientType.DAILY,
                            amount_charged=amount,
                            note="Kunlik mijoz tashrifi",
                        )
                        ClientPayment.objects.create(
                            business=fz,
                            client=client,
                            membership=None,
                            amount=amount,
                            currency="UZS",
                            payment_date=vd,
                            method=ClientPayment.Method.CASH,
                            note="Kunlik mijoz to'lovi",
                        )

        for b in businesses[:40]:
            KnowledgeBase.objects.create(
                business=b,
                title="Tez-tez beriladigan savollar",
                content=f"{b.name} haqida: ish vaqti {b.working_hours}. Telefon: {b.phone}.",
                is_active=True,
            )

        for i in range(30):
            AIUsage.objects.create(
                city=city,
                business=businesses[i % len(businesses)],
                customer=customers[i % len(customers)],
                message="Narx qancha?",
                response="Iltimos, aniq modelni tanlang.",
                total_tokens=120,
                estimated_cost=Decimal("0.0001"),
            )

        edu_businesses = [b for b in businesses if b.business_type == Business.BusinessType.EDUCATION_CENTER]
        if edu_businesses:
            eb = edu_businesses[0]
            edu_items = [it for it in items if it.business_id == eb.id]
            demo_teachers = [
                ("Malika Aliyeva", "+998901200001", "Ingliz tili, IELTS"),
                ("Jamshid Karimov", "+998901200002", "Matematika, fizika"),
                ("Aziza Tursunova", "+998901200003", "Grafik dizayn, IT"),
            ]
            tchs = []
            for ti, (tname, tph, subj) in enumerate(demo_teachers):
                t, _ = Teacher.objects.get_or_create(
                    business=eb,
                    full_name=tname,
                    defaults={
                        "phone": tph,
                        "subjects": subj,
                        "bio": "Demo ustoz profili (seed_demo).",
                        "sort_order": ti,
                        "status": Teacher.Status.ACTIVE,
                    },
                )
                tchs.append(t)

            demo_group_defs = [
                ("Guruh A — boshlang‘ich", 0),
                ("Guruh B — o‘rta", 1),
                ("Guruh C — yuqori", 2),
            ]
            grs = []
            for gname, order in demo_group_defs:
                link_course = edu_items[order % len(edu_items)] if edu_items else None
                lead = tchs[order % len(tchs)]
                g, _ = StudentGroup.objects.get_or_create(
                    business=eb,
                    name=gname,
                    defaults={
                        "description": "Demo o‘quv guruhi (seed_demo).",
                        "sort_order": order,
                        "course": link_course,
                        "teacher": lead,
                    },
                )
                if g.teacher_id != lead.id:
                    g.teacher = lead
                    g.save(update_fields=["teacher"])
                grs.append(g)
            for idx, (name, phone) in enumerate(DEMO_STUDENTS):
                course = edu_items[idx % len(edu_items)] if edu_items else None
                g_row = grs[idx % len(grs)]
                st, _ = Student.objects.get_or_create(
                    business=eb,
                    phone=phone,
                    defaults={
                        "name": name,
                        "course": course,
                        "group": g_row,
                        "status": Student.Status.ACTIVE,
                        "notes": "Demo o‘quvchi (seed_demo).",
                    },
                )
                if st.group_id != g_row.id or (course and st.course_id != course.id):
                    st.group = g_row
                    if course:
                        st.course = course
                    st.save(update_fields=["group", "course"])

            # Demo ustoz / o‘quvchi kabineti (login sahifasidan to‘g‘ridan-to‘g‘ri sinash uchun)
            first_teacher = tchs[0]
            first_student = Student.objects.filter(business=eb).order_by("id").first()
            if first_teacher:
                u_t = User.objects.filter(username="ustoz_demo").first()
                if not u_t:
                    User.objects.create_user(
                        username="ustoz_demo",
                        password="demo12345",
                        role=User.Role.EDU_TEACHER,
                        full_name=first_teacher.full_name,
                        phone=first_teacher.phone or "",
                        portal_teacher=first_teacher,
                    )
                else:
                    u_t.set_password("demo12345")
                    u_t.role = User.Role.EDU_TEACHER
                    u_t.full_name = first_teacher.full_name
                    u_t.phone = first_teacher.phone or ""
                    u_t.portal_teacher = first_teacher
                    u_t.portal_student = None
                    u_t.portal_parent = None
                    u_t.save()
            if first_student:
                u_s = User.objects.filter(username="oquvchi_demo").first()
                if not u_s:
                    User.objects.create_user(
                        username="oquvchi_demo",
                        password="demo12345",
                        role=User.Role.EDU_STUDENT,
                        full_name=first_student.name,
                        phone=first_student.phone or "",
                        portal_student=first_student,
                    )
                else:
                    u_s.set_password("demo12345")
                    u_s.role = User.Role.EDU_STUDENT
                    u_s.full_name = first_student.name
                    u_s.phone = first_student.phone or ""
                    u_s.portal_student = first_student
                    u_s.portal_teacher = None
                    u_s.portal_parent = None
                    u_s.save()

        self.stdout.write(self.style.SUCCESS("seed_demo yakunlandi: Buxoro, 12 kategoriya, 30 biznes, 150 item."))
        self.stdout.write(self.style.SUCCESS("Super admin: admin / admin12345 | Biznes: biznes0 ... / demo12345"))
        self.stdout.write(
            self.style.SUCCESS(
                "Ta'lim demo kabinet: ustoz_demo / demo12345 | oquvchi_demo / demo12345 (bir xil markaz)"
            )
        )
