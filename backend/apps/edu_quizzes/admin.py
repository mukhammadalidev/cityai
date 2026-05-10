from django.contrib import admin

from .models import EduQuiz, EduQuizAttempt, EduQuizCategory, EduQuizQuestion


class EduQuizQuestionInline(admin.TabularInline):
    model = EduQuizQuestion
    extra = 0


@admin.register(EduQuizCategory)
class EduQuizCategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "business", "name", "created_at")
    list_filter = ("business",)


@admin.register(EduQuizAttempt)
class EduQuizAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "student", "quiz", "correct_count", "total_questions", "created_at")
    list_filter = ("quiz__business",)


@admin.register(EduQuiz)
class EduQuizAdmin(admin.ModelAdmin):
    list_display = ("id", "business", "title", "category", "assessment_type", "time_limit_minutes", "is_published")
    list_filter = ("business", "assessment_type", "is_published")
    inlines = [EduQuizQuestionInline]
