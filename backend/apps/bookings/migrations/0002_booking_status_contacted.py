from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("bookings", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="booking",
            name="status",
            field=models.CharField(
                choices=[
                    ("new", "Yangi"),
                    ("confirmed", "Tasdiqlangan"),
                    ("rejected", "Rad etilgan"),
                    ("completed", "Bajarilgan"),
                    ("cancelled", "Bekor qilingan"),
                    ("contacted", "Bog‘lanildi"),
                ],
                default="new",
                max_length=20,
            ),
        ),
    ]
