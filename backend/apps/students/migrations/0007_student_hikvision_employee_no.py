# Generated manually for Hikvision FaceID mapping

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0006_student_face_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="hikvision_employee_no",
            field=models.CharField(blank=True, max_length=50, null=True, unique=True),
        ),
    ]
