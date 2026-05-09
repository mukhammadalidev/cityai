import random

from django.core.management.base import BaseCommand

from cars.models import Car


class Command(BaseCommand):
    help = "Seed database with 20 sample cars"

    def handle(self, *args, **options):
        samples = [
            ("Chevrolet", "Tracker"),
            ("Chevrolet", "Cobalt"),
            ("Chevrolet", "Malibu"),
            ("Kia", "K5"),
            ("Kia", "Sportage"),
            ("BYD", "Song Plus"),
            ("BYD", "Seagull"),
            ("Toyota", "Corolla"),
            ("Toyota", "Camry"),
            ("Hyundai", "Elantra"),
        ]
        colors = ["Oq", "Qora", "Kulrang", "Ko'k"]
        created = 0
        for idx in range(20):
            brand, model = samples[idx % len(samples)]
            _, was_created = Car.objects.get_or_create(
                brand=brand,
                model=f"{model} {idx + 1}",
                defaults={
                    "year": random.randint(2020, 2025),
                    "price": random.randint(120_000_000, 420_000_000),
                    "currency": "UZS",
                    "condition": random.choice([Car.Condition.NEW, Car.Condition.USED]),
                    "body_type": random.choice(["SUV", "Sedan", "Hatchback"]),
                    "fuel_type": random.choice(["Benzin", "Gaz", "Electric"]),
                    "transmission": random.choice(["Avtomat", "Mexanika"]),
                    "mileage": random.randint(0, 120_000),
                    "color": random.choice(colors),
                    "description": "Demo mashina tavsifi.",
                    "has_credit": True,
                    "has_trade_in": True,
                    "status": Car.Status.ACTIVE,
                },
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Seed completed. Created cars: {created}"))
