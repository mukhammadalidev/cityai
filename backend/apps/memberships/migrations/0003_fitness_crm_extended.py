# Generated for fitness CRM extension

from decimal import Decimal

import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("memberships", "0002_businessclient_announcement_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="businessclient",
            name="photo",
            field=models.ImageField(blank=True, null=True, upload_to="fitness/members/"),
        ),
        migrations.AddField(
            model_name="businessclient",
            name="emergency_contact",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="businessclient",
            name="joined_date",
            field=models.DateField(default=django.utils.timezone.localdate),
        ),
        migrations.AlterField(
            model_name="businessclient",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Faol"),
                    ("inactive", "Nofaol"),
                    ("frozen", "Muzlatilgan"),
                    ("paused", "To'xtatilgan"),
                    ("archived", "Arxiv"),
                ],
                db_index=True,
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientmembership",
            name="plan_type",
            field=models.CharField(
                blank=True,
                choices=[
                    ("1_month", "1 oy"),
                    ("3_month", "3 oy"),
                    ("6_month", "6 oy"),
                    ("12_month", "12 oy"),
                    ("individual", "Individual"),
                ],
                default="1_month",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientmembership",
            name="plan_name",
            field=models.CharField(blank=True, help_text="Ko'rinadigan abonement nomi", max_length=255),
        ),
        migrations.AddField(
            model_name="clientmembership",
            name="price",
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal("0"),
                help_text="Abonement narxi",
                max_digits=15,
            ),
        ),
        migrations.AlterField(
            model_name="clientmembership",
            name="payment_status",
            field=models.CharField(
                choices=[
                    ("unpaid", "To'lanmagan"),
                    ("partial", "Qisman to'langan"),
                    ("paid", "To'langan"),
                    ("debt", "Qarzdor"),
                ],
                db_index=True,
                default="unpaid",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="clientmembership",
            name="status",
            field=models.CharField(
                choices=[
                    ("active", "Faol"),
                    ("expiring", "Muddati tugayapti"),
                    ("expired", "Muddati tugagan"),
                    ("frozen", "Muzlatilgan"),
                    ("cancelled", "Bekor qilingan"),
                ],
                db_index=True,
                default="active",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientpayment",
            name="status",
            field=models.CharField(
                choices=[
                    ("paid", "To'langan"),
                    ("partial", "Qisman"),
                    ("debt", "Qarz"),
                ],
                default="paid",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientpayment",
            name="comment",
            field=models.CharField(blank=True, max_length=500),
        ),
        migrations.AlterField(
            model_name="clientpayment",
            name="method",
            field=models.CharField(
                choices=[
                    ("cash", "Naqd"),
                    ("card", "Karta"),
                    ("transfer", "O'tkazma"),
                    ("click", "Click"),
                    ("payme", "Payme"),
                    ("other", "Boshqa"),
                ],
                default="cash",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="clientattendance",
            name="check_in_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="clientattendance",
            name="check_out_time",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="clientattendance",
            name="status",
            field=models.CharField(
                choices=[("present", "Keldi"), ("absent", "Kelmadi")],
                db_index=True,
                default="present",
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name="FitnessTrainer",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("full_name", models.CharField(max_length=255)),
                ("phone", models.CharField(blank=True, max_length=30)),
                ("specialization", models.CharField(blank=True, max_length=255)),
                ("photo", models.ImageField(blank=True, null=True, upload_to="fitness/trainers/")),
                (
                    "salary_type",
                    models.CharField(
                        choices=[("fixed", "Belgilangan"), ("percent", "Foiz")],
                        default="fixed",
                        max_length=20,
                    ),
                ),
                ("salary_amount", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=15)),
                (
                    "status",
                    models.CharField(
                        choices=[("active", "Faol"), ("inactive", "Nofaol")],
                        db_index=True,
                        default="active",
                        max_length=20,
                    ),
                ),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fitness_trainers",
                        to="businesses.business",
                    ),
                ),
            ],
            options={"ordering": ["full_name", "id"]},
        ),
        migrations.CreateModel(
            name="FitnessClassSession",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=255)),
                (
                    "session_type",
                    models.CharField(
                        choices=[("group", "Guruh"), ("individual", "Individual")],
                        default="group",
                        max_length=20,
                    ),
                ),
                ("session_date", models.DateField(default=django.utils.timezone.localdate)),
                ("start_time", models.TimeField()),
                ("end_time", models.TimeField()),
                ("max_members", models.PositiveIntegerField(default=20)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("scheduled", "Rejalashtirilgan"),
                            ("completed", "O'tkazilgan"),
                            ("cancelled", "Bekor qilingan"),
                        ],
                        db_index=True,
                        default="scheduled",
                        max_length=20,
                    ),
                ),
                ("note", models.TextField(blank=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="fitness_sessions",
                        to="businesses.business",
                    ),
                ),
                (
                    "trainer",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="sessions",
                        to="memberships.fitnesstrainer",
                    ),
                ),
            ],
            options={"ordering": ["session_date", "start_time", "id"]},
        ),
        migrations.CreateModel(
            name="FitnessClassEnrollment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "client",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="class_enrollments",
                        to="memberships.businessclient",
                    ),
                ),
                (
                    "session",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="enrollments",
                        to="memberships.fitnessclasssession",
                    ),
                ),
            ],
            options={
                "ordering": ["id"],
                "unique_together": {("session", "client")},
            },
        ),
    ]
