from django.db import migrations, models


def set_edu_plan_flags(apps, schema_editor):
    Plan = apps.get_model("subscriptions", "SubscriptionPlan")
    mapping = {
        "demo": (False, False, False),
        "start": (True, True, False),
        "business": (True, True, True),
        "premium": (True, True, True),
    }
    for code, (att, mat, port) in mapping.items():
        Plan.objects.filter(code=code).update(
            has_edu_attendance=att,
            has_edu_materials=mat,
            has_edu_portals=port,
        )


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="subscriptionplan",
            name="has_edu_attendance",
            field=models.BooleanField(
                default=False,
                help_text="O‘quv markaz: kunlik/oylik davomat moduli",
            ),
        ),
        migrations.AddField(
            model_name="subscriptionplan",
            name="has_edu_materials",
            field=models.BooleanField(
                default=False,
                help_text="O‘quv markaz: kitob va mahsulotlar (Materiallar)",
            ),
        ),
        migrations.AddField(
            model_name="subscriptionplan",
            name="has_edu_portals",
            field=models.BooleanField(
                default=False,
                help_text="O‘quv markaz: ustoz / o‘quvchi / ota-ona kabinet loginlari",
            ),
        ),
        migrations.RunPython(set_edu_plan_flags, migrations.RunPython.noop),
    ]
