import random
from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from cars.models import Car
from customers.models import TelegramCustomer
from knowledge.models import KnowledgeBase
from leads.models import Lead, TestDrive, TradeInRequest


class Command(BaseCommand):
    help = "Seed test database for frontend integration"

    def handle(self, *args, **options):
        User = get_user_model()
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={
                "role": "admin",
                "is_superuser": True,
                "is_staff": True,
                "full_name": "Admin User",
                "phone": "+998900000001",
            },
        )
        admin.set_password("admin12345")
        admin.save()

        for idx in range(1, 6):
            manager, created = User.objects.get_or_create(
                username=f"manager{idx}",
                defaults={
                    "role": "manager",
                    "full_name": f"Manager {idx}",
                    "phone": f"+9989011122{idx:02d}",
                    "telegram_id": f"1000{idx}",
                    "is_active": True,
                },
            )
            if created:
                manager.set_password("manager12345")
                manager.save()

        if Car.objects.count() < 20:
            self.stdout.write("Cars kam, seed_cars ishga tushirildi...")
            from django.core.management import call_command

            call_command("seed_cars")

        cars = list(Car.objects.filter(status=Car.Status.ACTIVE)[:20])
        managers = list(User.objects.filter(role="manager")[:5])

        customers = []
        for idx in range(1, 31):
            customer, _ = TelegramCustomer.objects.get_or_create(
                telegram_id=f"tg_{idx}",
                defaults={
                    "username": f"user{idx}",
                    "first_name": f"Mijoz {idx}",
                    "last_name": "Test",
                    "phone": f"+99890{7000000 + idx}",
                    "language": "uz",
                },
            )
            customers.append(customer)

        lead_types = [choice[0] for choice in Lead.LeadType.choices]
        lead_statuses = [choice[0] for choice in Lead.Status.choices]
        for idx in range(1, 31):
            Lead.objects.get_or_create(
                phone=f"+99893{5000000 + idx}",
                defaults={
                    "customer": customers[(idx - 1) % len(customers)],
                    "car": cars[(idx - 1) % len(cars)] if cars else None,
                    "lead_type": lead_types[(idx - 1) % len(lead_types)],
                    "name": f"Lead Mijoz {idx}",
                    "message": "Narx va kredit haqida ma'lumot kerak.",
                    "status": lead_statuses[(idx - 1) % len(lead_statuses)],
                    "assigned_to": random.choice(managers) if managers else None,
                },
            )

        test_statuses = [choice[0] for choice in TestDrive.Status.choices]
        for idx in range(1, 11):
            TestDrive.objects.get_or_create(
                phone=f"+99894{6000000 + idx}",
                defaults={
                    "customer": customers[(idx - 1) % len(customers)],
                    "car": cars[(idx - 1) % len(cars)] if cars else None,
                    "name": f"TestDrive {idx}",
                    "preferred_date": date.today() + timedelta(days=idx),
                    "preferred_time": time(hour=10 + idx % 7, minute=0),
                    "status": test_statuses[(idx - 1) % len(test_statuses)],
                },
            )

        trade_statuses = [choice[0] for choice in TradeInRequest.Status.choices]
        for idx in range(1, 11):
            TradeInRequest.objects.get_or_create(
                phone=f"+99895{7000000 + idx}",
                defaults={
                    "customer": customers[(idx - 1) % len(customers)],
                    "name": f"TradeIn {idx}",
                    "brand": "Chevrolet",
                    "model": "Malibu" if idx % 2 else "Cobalt",
                    "year": 2018 + idx % 6,
                    "mileage": 50000 + idx * 4000,
                    "condition_note": "Yaxshi holatda, mayda bo'yoq ishlari bor.",
                    "expected_price": 120000000 + idx * 5000000,
                    "status": trade_statuses[(idx - 1) % len(trade_statuses)],
                },
            )

        kb_entries = [
            ("Ish vaqti", "Har kuni 09:00 dan 20:00 gacha ishlaymiz."),
            ("Manzil", "Toshkent shahri, Sergeli tumani."),
            ("Kredit", "Boshlang'ich to'lov 20% dan, muddat 12-60 oy."),
            ("Trade-in", "Eski mashinani baholab yangi mashinaga almashtirish mumkin."),
            ("Test drive", "Oldindan ariza qoldirib test drive qilishingiz mumkin."),
            ("Kafolat", "Yangi mashinalarga rasmiy kafolat mavjud."),
            ("Rasmiylashtirish", "Hujjatlarni 1 ish kunida tayyorlashga yordam beramiz."),
            ("Yetkazib berish", "Hududlarga pullik yetkazib berish xizmati mavjud."),
        ]
        for title, content in kb_entries:
            KnowledgeBase.objects.get_or_create(title=title, defaults={"content": content, "is_active": True})

        self.stdout.write(self.style.SUCCESS("Test DB muvaffaqiyatli to'ldirildi."))
        self.stdout.write(self.style.SUCCESS(f"Leads: {Lead.objects.count()}, Cars: {Car.objects.count()}"))
        self.stdout.write(self.style.WARNING("Login: admin / admin12345"))
