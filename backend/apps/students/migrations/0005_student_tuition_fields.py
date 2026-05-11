from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("students", "0004_student_rating"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="tuition_paid_until",
            field=models.DateField(blank=True, db_index=True, null=True),
        ),
        migrations.AddField(
            model_name="student",
            name="tuition_payment_note",
            field=models.CharField(blank=True, max_length=500),
        ),
    ]
