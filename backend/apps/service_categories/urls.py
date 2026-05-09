from rest_framework.routers import DefaultRouter

from .views import ServiceCategoryViewSet

router = DefaultRouter()
router.register(r"service-categories", ServiceCategoryViewSet, basename="servicecategory")

urlpatterns = router.urls
