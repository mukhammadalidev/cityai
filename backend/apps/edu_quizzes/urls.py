from rest_framework.routers import DefaultRouter

from .views import EduQuizCategoryViewSet, EduQuizViewSet

router = DefaultRouter()
router.register(r"edu-quiz-categories", EduQuizCategoryViewSet, basename="eduquizcategory")
router.register(r"edu-quizzes", EduQuizViewSet, basename="eduquiz")

urlpatterns = router.urls
