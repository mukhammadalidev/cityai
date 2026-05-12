from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0002_alter_lead_lead_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="lead",
            name="lead_type",
            field=models.CharField(
                choices=[
                    ("general", "Umumiy"),
                    ("car_interest", "Mashina qiziqishi"),
                    ("credit", "Kredit"),
                    ("test_drive", "Test drive"),
                    ("trade_in", "Trade-in"),
                    ("contact", "Aloqa"),
                    ("course_register", "Kursga yozilish"),
                    ("order", "Buyurtma"),
                    ("price_question", "Narx haqida"),
                    ("delivery_question", "Yetkazib berish"),
                    ("payment_question", "To‘lov"),
                    ("property_interest", "Uy qiziqishi"),
                    ("product_question", "Mahsulot savoli"),
                    ("membership_request", "Abonement arizasi"),
                    ("custom", "Boshqa"),
                ],
                default="general",
                max_length=30,
            ),
        ),
    ]
