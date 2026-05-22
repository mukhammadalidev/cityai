"""Demo fitness CRM ma'lumotlari: python manage.py seed_fitness_data"""

from __future__ import annotations

import random
from datetime import date, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.businesses.models import Business
from apps.memberships.models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
    FitnessClassEnrollment,
    FitnessClassSession,
    FitnessTrainer,
)

NAMES = [
    "Alisher Karimov",
    "Dilnoza Rahimova",
    "Jasur Toshmatov",
    "Madina Yusupova",
    "Sardor Qodirov",
    "Nilufar Ergasheva",
    "Bekzod Mirzayev",
    "Gulnora Sattorova",
    "Otabek Nazarov",
    "Kamola Abdullayeva",
    "Rustam Jo'rayev",
    "Sevara Ismoilova",
    "Farhod Tursunov",
    "Laylo Xolmatova",
    "Timur Pulatov",
    "Zarina Norboyeva",
    "Shohruh Mamatov",
    "Feruza Qosimova",
    "Azizbek Raxmonov",
    "Dilbar Usmonova",
    "Javohir Saidov",
    "Mohira Tursunova",
    "Bobur Xasanov",
    "Nargiza Olimova",
    "Sanjar Mirzoev",
    "Guzal Bekmurodova",
    "Ulug'bek Qodirov",
    "Maftuna Erkinova",
    "Husan Jo'rayev",
    "Lola Raximova",
]

PLANS = [
    (ClientMembership.PlanType.MONTH_1, "1 oylik zal", Decimal("450000"), 1),
    (ClientMembership.PlanType.MONTH_3, "3 oylik zal", Decimal("1200000"), 3),
    (ClientMembership.PlanType.MONTH_6, "6 oylik zal", Decimal("2200000"), 6),
    (ClientMembership.PlanType.MONTH_12, "12 oylik zal", Decimal("4000000"), 12),
    (ClientMembership.PlanType.INDIVIDUAL, "Individual trener", Decimal("800000"), 1),
]

TRAINERS = [
    ("Aliyev Jasur", "Kuch mashqlari", "fixed", Decimal("5000000")),
    ("Sardor Olimov", "Kardio", "percent", Decimal("25")),
    ("Malika Tosheva", "Yoga / stretching", "fixed", Decimal("4500000")),
    ("Rustam Jo'rayev", "Boks / MMA", "fixed", Decimal("5500000")),
    ("Dilnoza Karimova", "CrossFit", "percent", Decimal("30")),
]


class Command(BaseCommand):
    help = "Fitness zal uchun demo a'zolar, trenerlar, to'lovlar, davomat va jadval."

    def add_arguments(self, parser):
        parser.add_argument("--business-id", type=int, default=None, help="Fitness biznes ID")

    def handle(self, *args, **options):
        business = self._resolve_business(options.get("business_id"))
        if not business:
            self.stderr.write("Fitness markaz topilmadi. Avval seed_demo yoki fitness biznes yarating.")
            return

        today = timezone.localdate()
        trainers = self._seed_trainers(business)
        members = self._seed_members(business, today)
        memberships = self._seed_subscriptions(business, members, today)
        self._seed_payments(business, memberships)
        self._seed_attendance(business, members, today)
        self._seed_schedules(business, trainers, members, today)

        self.stdout.write(self.style.SUCCESS(
            f"Fitness demo: biznes #{business.id} ({business.name}) — "
            f"{len(members)} a'zo, {len(trainers)} trener, {len(memberships)} abonement."
        ))

    def _resolve_business(self, business_id):
        if business_id:
            return Business.objects.filter(pk=business_id).first()
        return (
            Business.objects.filter(business_type=Business.BusinessType.FITNESS_CENTER)
            .order_by("id")
            .first()
        )

    def _seed_trainers(self, business):
        out = []
        for full_name, spec, st, sal in TRAINERS:
            t, _ = FitnessTrainer.objects.get_or_create(
                business=business,
                full_name=full_name,
                defaults={
                    "specialization": spec,
                    "salary_type": st,
                    "salary_amount": sal,
                    "phone": f"+9989{random.randint(10000000, 99999999)}",
                    "status": FitnessTrainer.Status.ACTIVE,
                },
            )
            out.append(t)
        return out

    def _seed_members(self, business, today):
        members = []
        for i, name in enumerate(NAMES):
            status = BusinessClient.Status.ACTIVE
            if i >= 27:
                status = BusinessClient.Status.INACTIVE
            elif i >= 24:
                status = BusinessClient.Status.FROZEN
            m, _ = BusinessClient.objects.get_or_create(
                business=business,
                full_name=name,
                defaults={
                    "phone": f"+9989{random.randint(10000000, 99999999)}",
                    "gender": random.choice(
                        [BusinessClient.Gender.MALE, BusinessClient.Gender.FEMALE]
                    ),
                    "birth_date": today.replace(year=today.year - random.randint(18, 45)),
                    "joined_date": today - timedelta(days=random.randint(1, 400)),
                    "status": status,
                    "emergency_contact": f"+9989{random.randint(10000000, 99999999)}",
                    "client_type": BusinessClient.ClientType.MONTHLY,
                },
            )
            members.append(m)
        return members

    def _seed_subscriptions(self, business, members, today):
        memberships = []
        for idx, member in enumerate(members[:25]):
            plan_type, plan_name, price, months = random.choice(PLANS)
            start = today - timedelta(days=random.randint(0, 60))
            end = start + timedelta(days=30 * months)
            paid = price if random.random() > 0.35 else Decimal("0")
            if random.random() > 0.6:
                paid = price * Decimal("0.5")
            status = ClientMembership.Status.ACTIVE
            if end < today:
                status = ClientMembership.Status.EXPIRED
            elif (end - today).days <= 7:
                status = ClientMembership.Status.EXPIRING
            m = ClientMembership.objects.create(
                business=business,
                client=member,
                plan_type=plan_type,
                plan_name=plan_name,
                title=plan_name,
                start_date=start,
                end_date=end,
                price=price,
                expected_amount=price,
                paid_amount=paid,
                status=status,
            )
            m.recalc_payment_status()
            m.save(update_fields=["payment_status"])
            memberships.append(m)
        return memberships

    def _seed_payments(self, business, memberships):
        methods = list(ClientPayment.Method.choices)
        count = 0
        for m in memberships:
            if m.paid_amount <= 0:
                continue
            for _ in range(random.randint(1, 2)):
                ClientPayment.objects.create(
                    business=business,
                    client=m.client,
                    membership=m,
                    amount=m.paid_amount / 2 if m.paid_amount > 100000 else m.paid_amount,
                    payment_date=m.start_date + timedelta(days=random.randint(0, 5)),
                    method=random.choice(methods)[0],
                    status=ClientPayment.Status.PAID,
                    comment="Demo to'lov",
                )
                count += 1
                if count >= 50:
                    return

    def _seed_attendance(self, business, members, today):
        for member in members[:20]:
            for d in range(5):
                visit = today - timedelta(days=d)
                ClientAttendance.objects.get_or_create(
                    business=business,
                    client=member,
                    visit_date=visit,
                    defaults={
                        "check_in_time": timezone.now() - timedelta(days=d, hours=2),
                        "status": ClientAttendance.Status.PRESENT,
                        "client_type": member.client_type,
                    },
                )

    def _seed_schedules(self, business, trainers, members, today):
        titles = ["Ertalabki kardio", "Kuch mashqlari", "CrossFit", "Yoga", "Boks"]
        for i in range(10):
            trainer = random.choice(trainers)
            session, _ = FitnessClassSession.objects.get_or_create(
                business=business,
                title=titles[i % len(titles)],
                session_date=today + timedelta(days=i % 3),
                start_time=time(8 + (i % 4) * 2, 0),
                defaults={
                    "trainer": trainer,
                    "end_time": time(9 + (i % 4) * 2, 30),
                    "max_members": 15,
                    "session_type": FitnessClassSession.SessionType.GROUP,
                    "status": FitnessClassSession.Status.SCHEDULED,
                },
            )
            for member in random.sample(members, min(5, len(members))):
                FitnessClassEnrollment.objects.get_or_create(session=session, client=member)
