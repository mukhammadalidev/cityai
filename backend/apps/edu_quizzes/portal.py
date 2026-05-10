"""O‘quvchi portali uchun testlar (to‘g‘ri javoblar yuborilmaydi)."""

from .models import EduQuiz


def portal_quizzes_for_business(business_id: int) -> list[dict]:
    qs = (
        EduQuiz.objects.filter(business_id=business_id, is_published=True)
        .select_related("category")
        .prefetch_related("questions")
        .order_by("category__name", "title", "id")
    )[:80]
    out: list[dict] = []
    for quiz in qs:
        out.append(
            {
                "id": quiz.id,
                "title": quiz.title,
                "description": quiz.description or "",
                "assessment_type": quiz.assessment_type,
                "time_limit_minutes": quiz.time_limit_minutes,
                "category": {"id": quiz.category_id, "name": quiz.category.name},
                "questions": [
                    {
                        "id": q.id,
                        "sort_order": q.sort_order,
                        "prompt": q.prompt,
                        "options": q.options if isinstance(q.options, list) else [],
                    }
                    for q in quiz.questions.all().order_by("sort_order", "id")
                ],
            }
        )
    return out
