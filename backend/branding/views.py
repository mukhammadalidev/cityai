from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import BrandingSettings
from .serializers import BrandingSettingsSerializer


class BrandingSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = BrandingSettingsSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = BrandingSettings.objects.all().order_by("-updated_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset
from django.shortcuts import render

# Create your views here.
