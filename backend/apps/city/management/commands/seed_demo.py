import random
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
    ("⚖️ Yuridik xizmat", ServiceCategory.CategoryType.LEGAL_SERVICE),
    ("📷 Foto / video", ServiceCategory.CategoryType.PHOTO_VIDEO),
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

        # Tariflar: demo → start → business → premium (cheklovlar va funksiyalar asta-sekin o‘sadi).
        # Tuple: name, code, monthly, setup, max_items, max_managers, max_leads/mo, max_ai/mo,
        #        ai_chat, analytics, public_page, marketing, auto_followup, white_label,
        #        edu_attendance, edu_materials, edu_portals
        plans = [
            (
                "Demo",
                SubscriptionPlan.Code.DEMO,
                0,
                0,
                35,
                2,
                200,
                800,
                True,
                False,
                True,
                False,
                False,
                False,
                True,
                True,
                True,
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
            ),
        ]
        plan_objs = []
        for name, code, mprice, sprice, mi, mm, ml, ma, ai, an, pub, mk, af, wl, ed_a, ed_m, ed_p in plans:
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
            BusinessSubscription.objects.create(
                business=b,
                plan=demo_plan,
                status=BusinessSubscription.Status.ACTIVE,
                start_date=date.today() - timedelta(days=30),
                end_date=date.today() + timedelta(days=30),
                next_payment_date=date.today() + timedelta(days=7),
            )
            Invoice.objects.create(
                business=b,
                amount=demo_plan.monthly_price,
                invoice_type=Invoice.InvoiceType.MONTHLY,
                status=Invoice.Status.PAID if i % 3 else Invoice.Status.UNPAID,
                due_date=date.today() + timedelta(days=14),
            )

        items = []
        for i in range(150):
            b = businesses[i % len(businesses)]
            title, meta, desc = _demo_item_title_metadata_description(b.business_type, i)
            items.append(
                Item.objects.create(
                    business=b,
                    title=title,
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
