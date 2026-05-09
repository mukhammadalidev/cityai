"""Ota-ona farzand kabinetini yaratishi (faqat Premium)."""

from django.db import migrations, models


def premium_parent_portal_on(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "SubscriptionPlan")
    Plan.objects.filter(code="premium").update(parent_can_create_student_portal=True)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0003_align_subscription_plans"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="parent_can_create_student_portal",
            field=models.BooleanField(
                default=False,
                help_text="Premium: ota-ona kabinetidan farzand uchun o‘quvchi login/parolni o‘zi yaratishi mumkin",
            ),
        ),
        migrations.RunPython(premium_parent_portal_on, noop),
    ]
