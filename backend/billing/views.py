from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Invoice, PaymentRecord
from .serializers import InvoiceSerializer, PaymentRecordSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Invoice.objects.all().order_by("-created_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(business_id=business_id)
        return queryset

    @action(detail=True, methods=["patch"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = Invoice.Status.PAID
        invoice.paid_at = timezone.now()
        invoice.save(update_fields=["status", "paid_at"])
        return Response({"message": "Hisob-faktura to'landi deb belgilandi."})


class PaymentRecordViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentRecordSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = PaymentRecord.objects.select_related("invoice").all().order_by("-paid_at")
        if business_id := self.request.query_params.get("business_id"):
            queryset = queryset.filter(invoice__business_id=business_id)
        return queryset
from django.shortcuts import render

# Create your views here.
