# Generated manually for Hikvision FaceID attendance

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("students", "0007_student_hikvision_employee_no"),
    ]

    operations = [
        migrations.CreateModel(
            name="Attendance",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "status",
                    models.CharField(
                        choices=[("came", "Keldi"), ("left", "Ketdi")],
                        db_index=True,
                        default="came",
                        max_length=10,
                    ),
                ),
                ("event_time", models.DateTimeField(db_index=True)),
                ("device_ip", models.CharField(max_length=45)),
                ("employee_no", models.CharField(db_index=True, max_length=50)),
                ("raw_data", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="face_device_attendances",
                        to="students.student",
                    ),
                ),
            ],
            options={
                "ordering": ["-event_time", "-id"],
            },
        ),
        migrations.AddIndex(
            model_name="attendance",
            index=models.Index(fields=["student", "status", "event_time"], name="attendance__student_16b3c0_idx"),
        ),
    ]
