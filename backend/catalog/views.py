from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import Category, Item
from .serializers import CategorySerializer, ItemSerializer
from subscriptions.services import check_item_limit


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Category.objects.all().order_by("-created_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Item.objects.all().order_by("-created_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset

    def create(self, request, *args, **kwargs):
        business_id = request.data.get("business")
        ok, error = check_item_limit(business_id)
        if not ok:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)
