from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        SUPER_ADMIN = "super_admin", "Super admin"
        BUSINESS_OWNER = "business_owner", "Biznes egasi"
        MANAGER = "manager", "Menejer"
        EDU_TEACHER = "edu_teacher", "O‘quv markaz ustozi"
        EDU_STUDENT = "edu_student", "O‘quv markaz o‘quvchisi"
        EDU_PARENT = "edu_parent", "O‘quv markaz ota-onasi"
        BUSINESS_CLIENT = "business_client", "Biznes klienti"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.BUSINESS_OWNER)
    full_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    telegram_id = models.CharField(max_length=50, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    portal_teacher = models.OneToOneField(
        "teachers.Teacher",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_user_account",
    )
    portal_student = models.OneToOneField(
        "students.Student",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_user_account",
    )
    portal_parent = models.ForeignKey(
        "students.Student",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="parent_portal_accounts",
    )
    portal_business_client = models.OneToOneField(
        "memberships.BusinessClient",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="portal_user_account",
    )

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=(
                    (models.Q(portal_teacher__isnull=True) | models.Q(portal_student__isnull=True))
                    & (models.Q(portal_teacher__isnull=True) | models.Q(portal_parent__isnull=True))
                    & (models.Q(portal_student__isnull=True) | models.Q(portal_parent__isnull=True))
                ),
                name="accounts_user_portal_at_most_one",
            ),
        ]

    def __str__(self) -> str:
        return self.full_name or self.username
