from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from businesses.models import Business
from catalog.models import Category, Item


class Command(BaseCommand):
    help = "Seed multi-business demo data for auto salon, education, and shop"

    def handle(self, *args, **options):
        User = get_user_model()
        owner, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "role": "admin",
                "is_superuser": True,
                "is_staff": True,
                "full_name": "Admin User",
            },
        )
        owner.set_password("admin12345")
        owner.save()

        businesses = [
            ("Auto Drive Salon", Business.BusinessType.AUTO_SALON),
            ("Edu Pro Center", Business.BusinessType.EDUCATION_CENTER),
            ("Smart Shop", Business.BusinessType.SHOP),
        ]

        created = []
        for name, btype in businesses:
            business, _ = Business.objects.get_or_create(owner=owner, name=name, defaults={"business_type": btype, "is_active": True})
            if business.business_type != btype:
                business.business_type = btype
            business.public_page_enabled = True
            business.phone = business.phone or "+998901112233"
            business.address = business.address or "Toshkent shahri"
            business.working_hours = business.working_hours or "09:00 – 20:00"
            business.hero_title = business.hero_title or name
            business.hero_subtitle = business.hero_subtitle or "Katalog va tezkor ariza"
            business.public_description = business.public_description or "Mahsulot yoki xizmatlarimizni ko‘ring, qisqa ariza qoldiring — mutaxassis tezda aloqaga chiqadi."
            business.save()
            created.append(business)

        auto = created[0]
        edu = created[1]
        shop = created[2]

        auto_categories = ["SUV", "Sedan", "Electric"]
        for cat_name in auto_categories:
            cat, _ = Category.objects.get_or_create(business=auto, name=cat_name, defaults={"type": "car"})
            Item.objects.get_or_create(
                business=auto,
                title=f"Chevrolet {cat_name} Demo",
                defaults={
                    "category": cat,
                    "price": 250000000,
                    "status": Item.Status.ACTIVE,
                    "metadata": {"brand": "Chevrolet", "model": "Tracker", "year": 2024, "fuel_type": "Benzin"},
                },
            )

        edu_categories = ["Frontend", "Backend", "English"]
        for cat_name in edu_categories:
            cat, _ = Category.objects.get_or_create(business=edu, name=cat_name, defaults={"type": "course"})
            Item.objects.get_or_create(
                business=edu,
                title=f"{cat_name} kursi",
                defaults={
                    "category": cat,
                    "price": 1200000,
                    "status": Item.Status.ACTIVE,
                    "metadata": {
                        "duration": "6 oy",
                        "level": "Beginner",
                        "teacher": "Aliyev Muhammad",
                        "lesson_days": "Dushanba, Chorshanba, Juma",
                        "lesson_time": "18:00",
                        "format": "Offline",
                    },
                },
            )

        shop_categories = ["Telefonlar", "Aksessuarlar", "Texnika"]
        for cat_name in shop_categories:
            cat, _ = Category.objects.get_or_create(business=shop, name=cat_name, defaults={"type": "product"})
            Item.objects.get_or_create(
                business=shop,
                title=f"{cat_name} mahsulot",
                defaults={
                    "category": cat,
                    "price": 3500000,
                    "status": Item.Status.ACTIVE,
                    "metadata": {"stock": 20, "discount": 10, "brand": "Samsung", "delivery_available": True},
                },
            )

        self.stdout.write(self.style.SUCCESS("Multi-business test DB tayyorlandi."))
        self.stdout.write(self.style.SUCCESS(f"Businesslar: {Business.objects.count()}, Itemlar: {Item.objects.count()}"))
