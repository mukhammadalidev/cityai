from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import FollowUpRule, FollowUpTask
from .serializers import FollowUpRuleSerializer, FollowUpTaskSerializer


class FollowUpRuleViewSet(viewsets.ModelViewSet):
    serializer_class = FollowUpRuleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = FollowUpRule.objects.all().order_by("-created_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset


class FollowUpTaskViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FollowUpTaskSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = FollowUpTask.objects.all().order_by("-scheduled_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset
from django.shortcuts import render

# Create your views here.
