from rest_framework.routers import DefaultRouter

from .views import BrandingSettingsViewSet

router = DefaultRouter()
router.register("branding", BrandingSettingsViewSet, basename="branding")

urlpatterns = router.urls
