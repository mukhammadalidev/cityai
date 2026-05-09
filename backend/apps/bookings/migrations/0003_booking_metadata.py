from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0002_booking_status_contacted"),
    ]

    operations = [
        migrations.AddField(
            model_name="booking",
            name="metadata",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
