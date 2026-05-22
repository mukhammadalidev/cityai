import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0002_item_education_catalog_kind"),
        ("students", "0008_remove_face_and_hikvision_fields"),
    ]

    operations = [
        migrations.CreateModel(
            name="StudentMonthlyPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("year", models.PositiveSmallIntegerField(db_index=True)),
                ("month", models.PositiveSmallIntegerField(db_index=True)),
                ("amount", models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                ("paid_amount", models.DecimalField(decimal_places=2, default=0, max_digits=15)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("paid", "To'landi"),
                            ("unpaid", "To'lanmagan"),
                            ("partial", "Qisman to'landi"),
                            ("debt", "Qarzdor"),
                        ],
                        db_index=True,
                        default="unpaid",
                        max_length=20,
                    ),
                ),
                ("note", models.CharField(blank=True, max_length=500)),
                ("paid_at", models.DateField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="student_monthly_payments",
                        to="businesses.business",
                    ),
                ),
                (
                    "course",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="student_monthly_payments",
                        to="catalog.item",
                    ),
                ),
                (
                    "group",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="monthly_payments",
                        to="students.studentgroup",
                    ),
                ),
                (
                    "student",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="monthly_payments",
                        to="students.student",
                    ),
                ),
            ],
            options={
                "ordering": ["-year", "-month", "student_id"],
            },
        ),
        migrations.AddConstraint(
            model_name="studentmonthlypayment",
            constraint=models.UniqueConstraint(
                fields=("student", "year", "month"), name="students_monthly_payment_student_year_month_uniq"
            ),
        ),
        migrations.AddIndex(
            model_name="studentmonthlypayment",
            index=models.Index(fields=["business", "year", "month"], name="students_smp_biz_y_m_idx"),
        ),
    ]
