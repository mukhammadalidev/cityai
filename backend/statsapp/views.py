from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from cars.models import Car
from leads.models import Lead, TestDrive, TradeInRequest


class DashboardStatsView(APIView):
    def get(self, request):
        today = timezone.localdate()
        return Response(
            {
                "today_leads": Lead.objects.filter(created_at__date=today).count(),
                "total_leads": Lead.objects.count(),
                "test_drives": TestDrive.objects.count(),
                "trade_in_requests": TradeInRequest.objects.count(),
                "active_cars": Car.objects.filter(status=Car.Status.ACTIVE).count(),
                "sold_cars": Car.objects.filter(status=Car.Status.SOLD).count(),
            }
        )
