from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("leads", "0001_initial"),
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
                    ("custom", "Boshqa"),
                ],
                default="general",
                max_length=30,
            ),
        ),
    ]
