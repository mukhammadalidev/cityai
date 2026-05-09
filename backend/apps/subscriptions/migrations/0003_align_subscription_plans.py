"""Demo/start/business/premium rejalarini cheklovlar va funksiyalar bo‘yicha moslashtirish."""

from decimal import Decimal

from django.db import migrations


def align_plans(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "SubscriptionPlan")
    specs = {
        "demo": {
            "name": "Demo",
            "monthly_price": Decimal("0"),
            "setup_price": Decimal("0"),
            "max_items": 35,
            "max_managers": 2,
            "max_leads_per_month": 200,
            "max_ai_messages_per_month": 800,
            "has_ai_chat": True,
            "has_analytics": False,
            "has_public_page": True,
            "has_marketing_generator": False,
            "has_auto_followup": False,
            "has_white_label": False,
            "has_edu_attendance": True,
            "has_edu_materials": True,
            "has_edu_portals": True,
            "is_active": True,
        },
        "start": {
            "name": "Start",
            "monthly_price": Decimal("149000"),
            "setup_price": Decimal("0"),
            "max_items": 120,
            "max_managers": 4,
            "max_leads_per_month": 1500,
            "max_ai_messages_per_month": 4000,
            "has_ai_chat": True,
            "has_analytics": False,
            "has_public_page": True,
            "has_marketing_generator": False,
            "has_auto_followup": False,
            "has_white_label": False,
            "has_edu_attendance": True,
            "has_edu_materials": True,
            "has_edu_portals": True,
            "is_active": True,
        },
        "business": {
            "name": "Business",
            "monthly_price": Decimal("399000"),
            "setup_price": Decimal("0"),
            "max_items": 500,
            "max_managers": 12,
            "max_leads_per_month": 8000,
            "max_ai_messages_per_month": 15000,
            "has_ai_chat": True,
            "has_analytics": True,
            "has_public_page": True,
            "has_marketing_generator": True,
            "has_auto_followup": True,
            "has_white_label": False,
            "has_edu_attendance": True,
            "has_edu_materials": True,
            "has_edu_portals": True,
            "is_active": True,
        },
        "premium": {
            "name": "Premium",
            "monthly_price": Decimal("799000"),
            "setup_price": Decimal("0"),
            "max_items": 20000,
            "max_managers": 80,
            "max_leads_per_month": 100000,
            "max_ai_messages_per_month": 100000,
            "has_ai_chat": True,
            "has_analytics": True,
            "has_public_page": True,
            "has_marketing_generator": True,
            "has_auto_followup": True,
            "has_white_label": True,
            "has_edu_attendance": True,
            "has_edu_materials": True,
            "has_edu_portals": True,
            "is_active": True,
        },
    }
    for code, fields in specs.items():
        Plan.objects.filter(code=code).update(**fields)


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0002_subscriptionplan_edu_features"),
    ]

    operations = [
        migrations.RunPython(align_plans, migrations.RunPython.noop),
    ]
