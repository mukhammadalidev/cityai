from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0007_student_hikvision_employee_no"),
    ]

    operations = [
        migrations.RemoveField(model_name="student", name="hikvision_employee_no"),
        migrations.RemoveField(model_name="student", name="face_photo"),
        migrations.RemoveField(model_name="student", name="face_consent"),
        migrations.RemoveField(model_name="student", name="face_registered_at"),
    ]
