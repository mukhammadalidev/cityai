from rest_framework import permissions, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.common.permissions import IsSuperAdmin
from apps.service_categories.models import ServiceCategory

from .models import BotMessageLog, BotSession, BotTemplate
from .serializers import BotMessageLogSerializer, BotSessionSerializer, BotTemplateSerializer


class BotTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BotTemplate.objects.filter(is_active=True)
    serializer_class = BotTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def category_types_view(request):
    data = [
        {"key": c.value, "label": c.label} for c in ServiceCategory.CategoryType
    ]
    return Response(data)


class BotSessionViewSet(viewsets.ModelViewSet):
    queryset = BotSession.objects.all()
    serializer_class = BotSessionSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]


class BotMessageLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BotMessageLog.objects.select_related("city", "customer", "business").all()
    serializer_class = BotMessageLogSerializer
    permission_classes = [permissions.IsAuthenticated, IsSuperAdmin]
