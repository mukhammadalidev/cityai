from rest_framework.routers import DefaultRouter

from .views import TelegramCustomerViewSet

router = DefaultRouter()
router.register(r"telegram-customers", TelegramCustomerViewSet, basename="telegramcustomer")

urlpatterns = router.urls
