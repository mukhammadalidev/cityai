from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import BusinessViewSet, business_types_view, public_business_lead_view, public_business_view

router = DefaultRouter()
router.register("", BusinessViewSet, basename="businesses")

urlpatterns = [
    path("types/", business_types_view, name="business-types"),
    path("public/<slug:slug>/", public_business_view, name="public-business"),
    path("public/<slug:slug>/lead/", public_business_lead_view, name="public-business-lead"),
]
urlpatterns += router.urls
