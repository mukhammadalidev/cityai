"""Abonement tugashi va qarzdorlik eslatmalari: python manage.py send_fitness_reminders"""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.businesses.models import Business
from apps.memberships.models import ClientMembership
from apps.memberships.notifications import notify_debtor_reminder, notify_membership_expiring_soon


class Command(BaseCommand):
    help = "Fitness: 7 kun qolgan abonementlar va qarzdorlar uchun Telegram eslatma."

    def handle(self, *args, **options):
        today = timezone.localdate()
        limit = today + timedelta(days=7)
        businesses = Business.objects.filter(business_type=Business.BusinessType.FITNESS_CENTER)

        exp_count = 0
        debt_count = 0
        for biz in businesses:
            expiring = ClientMembership.objects.filter(
                business=biz,
                status__in=[ClientMembership.Status.ACTIVE, ClientMembership.Status.EXPIRING],
                end_date__isnull=False,
                end_date__gte=today,
                end_date__lte=limit,
            ).select_related("client")
            for m in expiring:
                days = (m.end_date - today).days
                notify_membership_expiring_soon(m, days)
                exp_count += 1

            debtors = ClientMembership.objects.filter(
                business=biz,
            ).select_related("client")
            for m in debtors:
                if m.debt_amount > 0:
                    notify_debtor_reminder(m)
                    debt_count += 1

        self.stdout.write(self.style.SUCCESS(f"Yuborildi: {exp_count} tugash, {debt_count} qarzdor."))
