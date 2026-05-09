from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="education_catalog_kind",
            field=models.CharField(
                choices=[("course", "Kurs"), ("book", "Kitob"), ("product", "Boshqa mahsulot")],
                db_index=True,
                default="course",
                max_length=20,
            ),
        ),
    ]
