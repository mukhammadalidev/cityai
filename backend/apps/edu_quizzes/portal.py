"""O‘quvchi portali uchun testlar (to‘g‘ri javoblar yuborilmaydi)."""

from .models import EduQuiz, EduQuizAttempt


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


def _serialize_attempt_row(att: EduQuizAttempt) -> dict:
    q = att.quiz
    pct = round(100 * att.correct_count / att.total_questions, 1) if att.total_questions else 0.0
    return {
        "id": att.id,
        "quiz_id": att.quiz_id,
        "quiz_title": q.title,
        "assessment_type": q.assessment_type,
        "category_name": q.category.name if q.category_id else "",
        "correct": att.correct_count,
        "total": att.total_questions,
        "percent": pct,
        "created_at": att.created_at.isoformat(),
    }


def portal_quiz_data_for_student(student) -> tuple[list[dict], list[dict]]:
    """
    Chopiq testlar + har birida so‘nggi ball; va so‘nggi urinishlar ro‘yxati.
    student: apps.students.models.Student
    """
    quizzes = portal_quizzes_for_business(student.business_id)
    last_by_quiz: dict[int, EduQuizAttempt] = {}
    for att in EduQuizAttempt.objects.filter(student=student).select_related("quiz", "quiz__category").order_by(
        "-created_at"
    ):
        if att.quiz_id not in last_by_quiz:
            last_by_quiz[att.quiz_id] = att
    for row in quizzes:
        att = last_by_quiz.get(row["id"])
        if att:
            row["my_last_score"] = {
                "correct": att.correct_count,
                "total": att.total_questions,
                "percent": round(100 * att.correct_count / att.total_questions, 1) if att.total_questions else None,
                "created_at": att.created_at.isoformat(),
            }
        else:
            row["my_last_score"] = None

    history_qs = (
        EduQuizAttempt.objects.filter(student=student)
        .select_related("quiz", "quiz__category")
        .order_by("-created_at")[:50]
    )
    history = [_serialize_attempt_row(a) for a in history_qs]
    return quizzes, history
