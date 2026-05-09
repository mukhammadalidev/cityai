# Generated manually — biznes o‘chirishda OrderItem PROTECT Item ni bloklamasligi uchun.

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0001_initial"),
        ("orders", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="orderitem",
            name="item",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="order_lines",
                to="catalog.item",
            ),
        ),
    ]
