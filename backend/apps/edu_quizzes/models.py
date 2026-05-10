from django.db import models

from apps.businesses.models import Business


class EduQuizCategory(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="edu_quiz_categories")
    name = models.CharField(max_length=120)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name", "id"]
        constraints = [
            models.UniqueConstraint(fields=["business", "name"], name="uniq_edu_quiz_category_business_name"),
        ]

    def __str__(self) -> str:
        return f"{self.business_id}:{self.name}"


class EduQuiz(models.Model):
    class AssessmentType(models.TextChoices):
        QUIZ = "quiz", "Quiz"
        MOCK = "mock", "Mock test"

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name="edu_quizzes")
    category = models.ForeignKey(EduQuizCategory, on_delete=models.PROTECT, related_name="quizzes")
    assessment_type = models.CharField(
        max_length=16,
        choices=AssessmentType.choices,
        default=AssessmentType.QUIZ,
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    time_limit_minutes = models.PositiveIntegerField(default=15)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self) -> str:
        return self.title


class EduQuizQuestion(models.Model):
    quiz = models.ForeignKey(EduQuiz, on_delete=models.CASCADE, related_name="questions")
    sort_order = models.PositiveSmallIntegerField(default=0)
    prompt = models.TextField()
    options = models.JSONField(default=list)
    correct_index = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "id"]
