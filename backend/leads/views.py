from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Lead, LeadActivity, TestDrive, TradeInRequest
from .serializers import LeadActivitySerializer, LeadSerializer, TestDriveSerializer, TradeInRequestSerializer
from subscriptions.services import check_lead_limit


class LeadViewSet(viewsets.ModelViewSet):
    queryset = Lead.objects.all().order_by("-created_at")
    serializer_class = LeadSerializer

    def create(self, request, *args, **kwargs):
        business_id = request.data.get("business")
        ok, error = check_lead_limit(business_id)
        if not ok:
            return Response({"detail": error}, status=status.HTTP_400_BAD_REQUEST)
        return super().create(request, *args, **kwargs)

    @action(detail=True, methods=["post"], url_path="activities")
    def add_activity(self, request, pk=None):
        lead = self.get_object()
        payload = request.data.copy()
        payload["lead"] = lead.id
        payload["user"] = request.user.id
        serializer = LeadActivitySerializer(data=payload)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="assign")
    def assign_manager(self, request, pk=None):
        lead = self.get_object()
        lead.assigned_to_id = request.data.get("assigned_to")
        lead.save(update_fields=["assigned_to", "updated_at"])
        LeadActivity.objects.create(
            lead=lead,
            user=request.user,
            activity_type=LeadActivity.ActivityType.MANAGER_ASSIGNED,
            text="Lead managerga biriktirildi.",
        )
        return Response({"message": "Lead biriktirildi."})

    @action(detail=True, methods=["post"], url_path="follow-up")
    def set_follow_up(self, request, pk=None):
        lead = self.get_object()
        lead.next_follow_up_at = request.data.get("next_follow_up_at")
        lead.save(update_fields=["next_follow_up_at", "updated_at"])
        LeadActivity.objects.create(
            lead=lead,
            user=request.user,
            activity_type=LeadActivity.ActivityType.FOLLOW_UP_SCHEDULED,
            text="Follow-up vaqti belgilandi.",
        )
        return Response({"message": "Follow-up saqlandi."})


class TestDriveViewSet(viewsets.ModelViewSet):
    queryset = TestDrive.objects.all().order_by("-created_at")
    serializer_class = TestDriveSerializer


class TradeInRequestViewSet(viewsets.ModelViewSet):
    queryset = TradeInRequest.objects.all().order_by("-created_at")
    serializer_class = TradeInRequestSerializer
