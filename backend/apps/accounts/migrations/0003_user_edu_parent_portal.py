# Generated manually for edu_parent portal

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("students", "0003_studentgroup_teacher"),
        ("accounts", "0002_user_edu_portal"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="user",
            name="accounts_user_portal_at_most_one",
        ),
        migrations.AddField(
            model_name="user",
            name="portal_parent",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="parent_portal_accounts",
                to="students.student",
            ),
        ),
        migrations.AlterField(
            model_name="user",
            name="role",
            field=models.CharField(
                choices=[
                    ("super_admin", "Super admin"),
                    ("business_owner", "Biznes egasi"),
                    ("manager", "Menejer"),
                    ("edu_teacher", "O‘quv markaz ustozi"),
                    ("edu_student", "O‘quv markaz o‘quvchisi"),
                    ("edu_parent", "O‘quv markaz ota-onasi"),
                ],
                default="business_owner",
                max_length=20,
            ),
        ),
        migrations.AddConstraint(
            model_name="user",
            constraint=models.CheckConstraint(
                check=(
                    (models.Q(portal_teacher__isnull=True) | models.Q(portal_student__isnull=True))
                    & (models.Q(portal_teacher__isnull=True) | models.Q(portal_parent__isnull=True))
                    & (models.Q(portal_student__isnull=True) | models.Q(portal_parent__isnull=True))
                ),
                name="accounts_user_portal_at_most_one",
            ),
        ),
    ]
