from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("bot_engine", "0001_initial"),
        ("service_categories", "0002_add_fitness_center"),
    ]

    operations = [
        migrations.AlterField(
            model_name="bottemplate",
            name="category_type",
            field=models.CharField(
                choices=[
                    ("auto_salon", "Avtosalon"),
                    ("education_center", "O‘quv markaz"),
                    ("shop", "Do‘kon"),
                    ("restaurant", "Restoran"),
                    ("clinic", "Klinika"),
                    ("beauty_salon", "Go‘zallik saloni"),
                    ("repair_service", "Usta xizmatlari"),
                    ("real_estate", "Uy-joy"),
                    ("taxi_delivery", "Taxi / yetkazib berish"),
                    ("fitness", "Fitnes"),
                    ("fitness_center", "Fitness zal"),
                    ("legal_service", "Yuridik xizmat"),
                    ("photo_video", "Foto / video"),
                    ("event", "Tadbirlar"),
                    ("hotel", "Mehmonxona"),
                    ("tourism", "Turizm"),
                    ("car_rental", "Avto ijarasi"),
                    ("electronics_repair", "Elektronika ta’miri"),
                    ("cleaning", "Tozalash"),
                    ("custom", "Boshqa"),
                ],
                max_length=40,
            ),
        ),
    ]
