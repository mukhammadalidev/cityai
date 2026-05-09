from rest_framework import status, viewsets
from rest_framework.response import Response

from .models import KnowledgeBase
from .serializers import KnowledgeBaseSerializer
from subscriptions.services import check_knowledge_limit


class KnowledgeBaseViewSet(viewsets.ModelViewSet):
    queryset = KnowledgeBase.objects.all().order_by("-updated_at")
    serializer_class = KnowledgeBaseSerializer

    def create(self, request, *args, **kwargs):
        business_id = request.data.get("business")
        ok, error = check_knowledge_limit(business_id)
        if not ok:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)
