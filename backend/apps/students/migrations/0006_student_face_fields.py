from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0005_student_tuition_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="student",
            name="face_photo",
            field=models.ImageField(blank=True, null=True, upload_to="students/faces/"),
        ),
        migrations.AddField(
            model_name="student",
            name="face_consent",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="student",
            name="face_registered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
