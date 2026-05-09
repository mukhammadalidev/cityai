from rest_framework.routers import DefaultRouter

from .views import KnowledgeBaseViewSet

router = DefaultRouter()
router.register(r"knowledge", KnowledgeBaseViewSet, basename="knowledge")

urlpatterns = router.urls
