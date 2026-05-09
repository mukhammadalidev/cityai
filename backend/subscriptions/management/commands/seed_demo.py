from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from billing.models import Invoice
from businesses.models import Business
from subscriptions.models import BusinessSubscription, Plan


class Command(BaseCommand):
    help = "Seed default plans, subscriptions, and invoices"

    def handle(self, *args, **options):
        plans = [
            dict(
                name="Demo",
                code=Plan.Code.DEMO,
                monthly_price=0,
                setup_price=0,
                max_items=10,
                max_managers=1,
                max_leads_per_month=30,
                max_ai_messages_per_month=100,
                max_knowledge_entries=5,
                has_ai_chat=True,
                has_analytics=False,
                has_auto_followup=False,
                has_white_label=False,
                has_public_landing=False,
                has_marketing_generator=False,
            ),
            dict(
                name="Start",
                code=Plan.Code.START,
                monthly_price=300000,
                setup_price=1500000,
                max_items=50,
                max_managers=2,
                max_leads_per_month=300,
                max_ai_messages_per_month=1000,
                max_knowledge_entries=20,
                has_ai_chat=True,
                has_public_landing=True,
            ),
            dict(
                name="Business",
                code=Plan.Code.BUSINESS,
                monthly_price=700000,
                setup_price=3000000,
                max_items=300,
                max_managers=10,
                max_leads_per_month=2000,
                max_ai_messages_per_month=5000,
                max_knowledge_entries=100,
                has_ai_chat=True,
                has_analytics=True,
                has_auto_followup=True,
                has_public_landing=True,
                has_marketing_generator=True,
            ),
            dict(
                name="Premium",
                code=Plan.Code.PREMIUM,
                monthly_price=1500000,
                setup_price=7000000,
                max_items=999999,
                max_managers=999999,
                max_leads_per_month=999999,
                max_ai_messages_per_month=20000,
                max_knowledge_entries=999999,
                has_ai_chat=True,
                has_analytics=True,
                has_auto_followup=True,
                has_white_label=True,
                has_public_landing=True,
                has_marketing_generator=True,
                has_manager_performance=True,
                has_api_integration=True,
            ),
        ]
        for plan_data in plans:
            code = plan_data.pop("code")
            Plan.objects.update_or_create(code=code, defaults=plan_data)

        User = get_user_model()
        admin = User.objects.filter(username="admin").first()
        if not admin:
            admin = User.objects.create(username="admin", role="admin", is_superuser=True, is_staff=True)
            admin.set_password("admin12345")
            admin.save()

        demo_plan = Plan.objects.get(code=Plan.Code.DEMO)
        for business in Business.objects.all():
            sub, _ = BusinessSubscription.objects.update_or_create(
                business=business,
                defaults={
                    "plan": demo_plan,
                    "status": BusinessSubscription.Status.ACTIVE,
                    "start_date": date.today(),
                    "end_date": date.today() + timedelta(days=30),
                    "next_payment_date": date.today() + timedelta(days=30),
                },
            )
            Invoice.objects.get_or_create(
                business=business,
                subscription=sub,
                invoice_type=Invoice.InvoiceType.MONTHLY,
                due_date=date.today() + timedelta(days=30),
                defaults={"amount": demo_plan.monthly_price, "status": Invoice.Status.UNPAID},
            )

        self.stdout.write(self.style.SUCCESS("Demo monetization ma'lumotlari tayyorlandi."))
