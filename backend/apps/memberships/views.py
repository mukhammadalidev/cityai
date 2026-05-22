import calendar
from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.businesses.models import Business
from apps.businesses.services import accessible_business_ids

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
    FitnessClassEnrollment,
    FitnessClassSession,
    FitnessTrainer,
)
from .notifications import notify_member_created, notify_payment_received
from .serializers import (
    BusinessClientSerializer,
    ClientAttendanceSerializer,
    ClientMembershipSerializer,
    ClientPaymentSerializer,
    FitnessClassEnrollmentSerializer,
    FitnessClassSessionSerializer,
    FitnessTrainerSerializer,
)


def _ensure_business_access(request, business_id: int) -> None:
    user = request.user
    if not user.is_authenticated:
        raise PermissionDenied()
    if user.role == User.Role.SUPER_ADMIN:
        return
    ids = accessible_business_ids(user)
    if ids is not None and business_id not in ids:
        raise PermissionDenied()


def _scope_to_user(qs, request, business_field: str = "business_id"):
    user = request.user
    if not user.is_authenticated:
        return qs.none()
    if user.role == User.Role.SUPER_ADMIN:
        return qs
    ids = accessible_business_ids(user)
    if ids is None:
        return qs
    return qs.filter(**{f"{business_field}__in": ids})


def _parse_month(value: str | None) -> tuple[date, date]:
    today = timezone.localdate()
    if value:
        try:
            year, month = value.split("-")
            year_i = int(year)
            month_i = int(month)
        except (ValueError, AttributeError):
            raise ValidationError({"month": "Format: YYYY-MM"})
    else:
        year_i = today.year
        month_i = today.month
    first = date(year_i, month_i, 1)
    last_day = calendar.monthrange(year_i, month_i)[1]
    last = date(year_i, month_i, last_day)
    return first, last


class BusinessClientViewSet(viewsets.ModelViewSet):
    serializer_class = BusinessClientSerializer

    def get_queryset(self):
        qs = BusinessClient.objects.select_related("business")
        business_id = self.request.query_params.get("business_id")
        client_type = self.request.query_params.get("client_type")
        status_param = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if client_type:
            qs = qs.filter(client_type=client_type)
        if status_param:
            qs = qs.filter(status=status_param)
        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(phone__icontains=search))
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("-created_at", "id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        client = serializer.save()
        try:
            notify_member_created(client)
        except Exception:
            pass

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()

    @action(detail=True, methods=["get"], url_path="ledger")
    def ledger(self, request, pk=None):
        client = self.get_object()
        _ensure_business_access(request, client.business_id)
        memberships = client.memberships.select_related("item").order_by("-start_date", "-id")
        payments = client.payments.order_by("-payment_date", "-id")[:50]
        attendances = client.attendances.order_by("-visit_date", "-id")[:50]
        return Response(
            {
                "client": BusinessClientSerializer(client).data,
                "memberships": ClientMembershipSerializer(memberships, many=True).data,
                "payments": ClientPaymentSerializer(payments, many=True).data,
                "attendances": ClientAttendanceSerializer(attendances, many=True).data,
            }
        )


class ClientMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = ClientMembershipSerializer

    def get_queryset(self):
        qs = ClientMembership.objects.select_related("business", "client", "item")
        business_id = self.request.query_params.get("business_id")
        client_id = self.request.query_params.get("client_id")
        status_param = self.request.query_params.get("status")
        payment_status = self.request.query_params.get("payment_status")
        client_type = self.request.query_params.get("client_type")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        if client_type:
            qs = qs.filter(client__client_type=client_type)
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("-start_date", "-id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()


class ClientPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = ClientPaymentSerializer

    def get_queryset(self):
        qs = ClientPayment.objects.select_related("business", "client", "membership")
        business_id = self.request.query_params.get("business_id")
        client_id = self.request.query_params.get("client_id")
        membership_id = self.request.query_params.get("membership_id")
        month = self.request.query_params.get("month")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if membership_id:
            qs = qs.filter(membership_id=membership_id)
        if month:
            first, last = _parse_month(month)
            qs = qs.filter(payment_date__gte=first, payment_date__lte=last)
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("-payment_date", "-id")

    @transaction.atomic
    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        payment: ClientPayment = serializer.save()
        if payment.membership_id:
            membership = ClientMembership.objects.select_for_update().get(pk=payment.membership_id)
            membership.paid_amount = (membership.paid_amount or Decimal("0")) + (
                payment.amount or Decimal("0")
            )
            membership.recalc_payment_status()
            membership.save(update_fields=["paid_amount", "payment_status", "updated_at"])
        try:
            notify_payment_received(payment)
        except Exception:
            pass

    @transaction.atomic
    def perform_update(self, serializer):
        instance: ClientPayment = serializer.instance
        biz = serializer.validated_data.get("business", instance.business)
        _ensure_business_access(self.request, biz.id)
        old_amount = instance.amount or Decimal("0")
        old_membership_id = instance.membership_id
        payment: ClientPayment = serializer.save()
        if old_membership_id and old_membership_id != payment.membership_id:
            old_m = ClientMembership.objects.select_for_update().filter(pk=old_membership_id).first()
            if old_m:
                old_m.paid_amount = max(Decimal("0"), (old_m.paid_amount or Decimal("0")) - old_amount)
                old_m.recalc_payment_status()
                old_m.save(update_fields=["paid_amount", "payment_status", "updated_at"])
        if payment.membership_id:
            new_m = ClientMembership.objects.select_for_update().get(pk=payment.membership_id)
            if old_membership_id == payment.membership_id:
                delta = (payment.amount or Decimal("0")) - old_amount
                new_m.paid_amount = max(Decimal("0"), (new_m.paid_amount or Decimal("0")) + delta)
            else:
                new_m.paid_amount = (new_m.paid_amount or Decimal("0")) + (payment.amount or Decimal("0"))
            new_m.recalc_payment_status()
            new_m.save(update_fields=["paid_amount", "payment_status", "updated_at"])

    @transaction.atomic
    def perform_destroy(self, instance: ClientPayment):
        _ensure_business_access(self.request, instance.business_id)
        if instance.membership_id:
            m = ClientMembership.objects.select_for_update().filter(pk=instance.membership_id).first()
            if m:
                m.paid_amount = max(Decimal("0"), (m.paid_amount or Decimal("0")) - (instance.amount or Decimal("0")))
                m.recalc_payment_status()
                m.save(update_fields=["paid_amount", "payment_status", "updated_at"])
        instance.delete()


class ClientAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = ClientAttendanceSerializer

    def get_queryset(self):
        qs = ClientAttendance.objects.select_related("business", "client", "membership")
        business_id = self.request.query_params.get("business_id")
        client_id = self.request.query_params.get("client_id")
        client_type = self.request.query_params.get("client_type")
        visit_date = self.request.query_params.get("date")
        month = self.request.query_params.get("month")
        date_from = self.request.query_params.get("date_from")
        date_to = self.request.query_params.get("date_to")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if client_id:
            qs = qs.filter(client_id=client_id)
        if client_type:
            qs = qs.filter(client_type=client_type)
        if visit_date:
            qs = qs.filter(visit_date=visit_date)
        if month:
            first, last = _parse_month(month)
            qs = qs.filter(visit_date__gte=first, visit_date__lte=last)
        if date_from:
            qs = qs.filter(visit_date__gte=date_from)
        if date_to:
            qs = qs.filter(visit_date__lte=date_to)
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("-visit_date", "-visit_time", "-id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    @action(detail=True, methods=["post"], url_path="check-out")
    def check_out(self, request, pk=None):
        att = self.get_object()
        _ensure_business_access(request, att.business_id)
        att.check_out_time = timezone.now()
        att.save(update_fields=["check_out_time"])
        return Response(ClientAttendanceSerializer(att, context={"request": request}).data)

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()


class FitnessDebtorsView(APIView):
    """GET /api/debtors/ — qarzdorlar ro'yxati."""

    def get(self, request):
        business_id = request.query_params.get("business_id")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        business_id_i = int(business_id)
        _ensure_business_access(request, business_id_i)
        debt_qs = (
            ClientMembership.objects.filter(business_id=business_id_i)
            .filter(expected_amount__gt=F("paid_amount"))
            .select_related("client")
            .order_by("-id")
        )
        return Response(
            {
                "debtors": [
                    {
                        "member_id": m.client_id,
                        "membership_id": m.id,
                        "member": m.client_id,
                        "member_name": m.client.full_name,
                        "phone": m.client.phone,
                        "total_amount": str(m.expected_amount),
                        "paid_amount": str(m.paid_amount),
                        "debt_amount": str(m.debt_amount),
                        "due_date": m.end_date.isoformat() if m.end_date else None,
                        "status": m.payment_status,
                    }
                    for m in debt_qs
                ]
            }
        )


class FitnessTrainerViewSet(viewsets.ModelViewSet):
    serializer_class = FitnessTrainerSerializer

    def get_queryset(self):
        qs = FitnessTrainer.objects.select_related("business")
        business_id = self.request.query_params.get("business_id")
        status_param = self.request.query_params.get("status")
        search = self.request.query_params.get("search")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if status_param:
            qs = qs.filter(status=status_param)
        if search:
            qs = qs.filter(Q(full_name__icontains=search) | Q(phone__icontains=search))
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("full_name", "id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()


class FitnessClassSessionViewSet(viewsets.ModelViewSet):
    serializer_class = FitnessClassSessionSerializer

    def get_queryset(self):
        qs = FitnessClassSession.objects.select_related("business", "trainer").prefetch_related(
            "enrollments__client"
        )
        business_id = self.request.query_params.get("business_id")
        trainer_id = self.request.query_params.get("trainer_id")
        session_date = self.request.query_params.get("date")
        if business_id:
            qs = qs.filter(business_id=business_id)
        if trainer_id:
            qs = qs.filter(trainer_id=trainer_id)
        if session_date:
            qs = qs.filter(session_date=session_date)
        qs = _scope_to_user(qs, self.request)
        return qs.order_by("session_date", "start_time", "id")

    def perform_create(self, serializer):
        biz = serializer.validated_data["business"]
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_update(self, serializer):
        biz = serializer.validated_data.get("business", serializer.instance.business)
        _ensure_business_access(self.request, biz.id)
        serializer.save()

    def perform_destroy(self, instance):
        _ensure_business_access(self.request, instance.business_id)
        instance.delete()

    @action(detail=True, methods=["post"], url_path="enroll")
    def enroll(self, request, pk=None):
        session = self.get_object()
        _ensure_business_access(request, session.business_id)
        client_id = request.data.get("client_id") or request.data.get("member_id")
        if not client_id:
            raise ValidationError({"client_id": "client_id majburiy."})
        client = BusinessClient.objects.filter(pk=client_id, business_id=session.business_id).first()
        if not client:
            raise NotFound("A'zo topilmadi.")
        if session.current_members >= session.max_members:
            raise ValidationError("Mashg'ulot to'ldi.")
        enrollment, created = FitnessClassEnrollment.objects.get_or_create(session=session, client=client)
        return Response(
            FitnessClassEnrollmentSerializer(enrollment).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="unenroll")
    def unenroll(self, request, pk=None):
        session = self.get_object()
        _ensure_business_access(request, session.business_id)
        client_id = request.data.get("client_id") or request.data.get("member_id")
        FitnessClassEnrollment.objects.filter(session=session, client_id=client_id).delete()
        return Response({"ok": True})


class FitnessAbonementsView(APIView):
    """Har bir abonement (Item) bo'yicha obunachilar va daromad statistikasi."""

    def get(self, request):
        business_id = request.query_params.get("business_id")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        try:
            business_id_i = int(business_id)
        except (TypeError, ValueError):
            raise ValidationError({"business_id": "business_id butun son bo'lishi kerak."})
        _ensure_business_access(request, business_id_i)
        business = Business.objects.filter(pk=business_id_i).first()
        if not business:
            raise NotFound("Biznes topilmadi.")

        from apps.catalog.models import Item

        items = list(Item.objects.filter(business_id=business_id_i).order_by("-created_at", "id"))
        memberships = list(
            ClientMembership.objects.filter(business_id=business_id_i).select_related("client")
        )

        by_item: dict[int | None, list[ClientMembership]] = {}
        for m in memberships:
            by_item.setdefault(m.item_id, []).append(m)

        payload = []
        for item in items:
            ms = by_item.get(item.id, [])
            active = [m for m in ms if m.status == ClientMembership.Status.ACTIVE]
            expected = sum((m.expected_amount or Decimal("0") for m in ms), Decimal("0"))
            paid = sum((m.paid_amount or Decimal("0") for m in ms), Decimal("0"))
            debt = sum((m.debt_amount for m in ms), Decimal("0"))
            subscribers = [
                {
                    "membership_id": m.id,
                    "client_id": m.client_id,
                    "client_name": m.client.full_name,
                    "client_phone": m.client.phone,
                    "client_type": m.client.client_type,
                    "start_date": m.start_date.isoformat() if m.start_date else None,
                    "end_date": m.end_date.isoformat() if m.end_date else None,
                    "expected_amount": str(m.expected_amount or Decimal("0")),
                    "paid_amount": str(m.paid_amount or Decimal("0")),
                    "debt_amount": str(m.debt_amount),
                    "status": m.status,
                    "payment_status": m.payment_status,
                }
                for m in ms
            ]
            payload.append(
                {
                    "item_id": item.id,
                    "title": item.title,
                    "price": str(item.price or Decimal("0")),
                    "currency": item.currency,
                    "status": item.status,
                    "subscribers_total": len(ms),
                    "subscribers_active": len(active),
                    "expected_amount": str(expected),
                    "paid_amount": str(paid),
                    "debt_amount": str(debt),
                    "subscribers": subscribers,
                }
            )

        # Item siz biriktirilgan abonementlar (custom title)
        orphan = by_item.get(None, [])
        if orphan:
            expected = sum((m.expected_amount or Decimal("0") for m in orphan), Decimal("0"))
            paid = sum((m.paid_amount or Decimal("0") for m in orphan), Decimal("0"))
            debt = sum((m.debt_amount for m in orphan), Decimal("0"))
            payload.append(
                {
                    "item_id": None,
                    "title": "Boshqa / qo'lda kiritilgan",
                    "price": "0",
                    "currency": "UZS",
                    "status": "active",
                    "subscribers_total": len(orphan),
                    "subscribers_active": sum(
                        1 for m in orphan if m.status == ClientMembership.Status.ACTIVE
                    ),
                    "expected_amount": str(expected),
                    "paid_amount": str(paid),
                    "debt_amount": str(debt),
                    "subscribers": [
                        {
                            "membership_id": m.id,
                            "client_id": m.client_id,
                            "client_name": m.client.full_name,
                            "client_phone": m.client.phone,
                            "client_type": m.client.client_type,
                            "start_date": m.start_date.isoformat() if m.start_date else None,
                            "end_date": m.end_date.isoformat() if m.end_date else None,
                            "expected_amount": str(m.expected_amount or Decimal("0")),
                            "paid_amount": str(m.paid_amount or Decimal("0")),
                            "debt_amount": str(m.debt_amount),
                            "status": m.status,
                            "payment_status": m.payment_status,
                        }
                        for m in orphan
                    ],
                }
            )

        return Response({"business_id": business_id_i, "items": payload})


class FitnessLedgerSummaryView(APIView):
    def get(self, request):
        business_id = request.query_params.get("business_id")
        month = request.query_params.get("month")
        if not business_id:
            raise ValidationError({"business_id": "business_id majburiy."})
        try:
            business_id_i = int(business_id)
        except (TypeError, ValueError):
            raise ValidationError({"business_id": "business_id butun son bo'lishi kerak."})
        _ensure_business_access(request, business_id_i)
        business = Business.objects.filter(pk=business_id_i).first()
        if not business:
            raise NotFound("Biznes topilmadi.")

        first, last = _parse_month(month)
        today = timezone.localdate()

        clients_qs = BusinessClient.objects.filter(business_id=business_id_i)
        clients_by_type = clients_qs.values("client_type").annotate(c=Count("id"))
        clients_map = {row["client_type"]: row["c"] for row in clients_by_type}
        active_monthly = clients_qs.filter(
            client_type=BusinessClient.ClientType.MONTHLY,
            status=BusinessClient.Status.ACTIVE,
        ).count()
        active_daily = clients_qs.filter(
            client_type=BusinessClient.ClientType.DAILY,
            status=BusinessClient.Status.ACTIVE,
        ).count()

        memberships_qs = ClientMembership.objects.filter(business_id=business_id_i)
        active_memberships = memberships_qs.filter(status=ClientMembership.Status.ACTIVE).count()
        expiring_soon = memberships_qs.filter(
            status=ClientMembership.Status.ACTIVE,
            end_date__isnull=False,
            end_date__gte=today,
            end_date__lte=today + timedelta(days=7),
        ).count()
        expired = memberships_qs.filter(
            Q(status=ClientMembership.Status.EXPIRED)
            | Q(end_date__lt=today, status=ClientMembership.Status.ACTIVE)
        ).count()

        expected_total = memberships_qs.aggregate(s=Sum("expected_amount")).get("s") or Decimal("0")
        paid_total = memberships_qs.aggregate(s=Sum("paid_amount")).get("s") or Decimal("0")
        debt_total = memberships_qs.filter(expected_amount__gt=F("paid_amount")).aggregate(
            s=Sum(F("expected_amount") - F("paid_amount"))
        ).get("s") or Decimal("0")

        month_payments = ClientPayment.objects.filter(
            business_id=business_id_i,
            payment_date__gte=first,
            payment_date__lte=last,
        )
        month_paid = month_payments.aggregate(s=Sum("amount")).get("s") or Decimal("0")
        month_payments_count = month_payments.count()

        attendance_qs = ClientAttendance.objects.filter(business_id=business_id_i)
        today_attendance = attendance_qs.filter(visit_date=today).count()
        month_attendance = attendance_qs.filter(
            visit_date__gte=first, visit_date__lte=last
        ).count()
        daily_revenue_month = attendance_qs.filter(
            visit_date__gte=first,
            visit_date__lte=last,
            client_type=BusinessClient.ClientType.DAILY,
        ).aggregate(s=Sum("amount_charged")).get("s") or Decimal("0")

        debtors = (
            memberships_qs.filter(expected_amount__gt=F("paid_amount"))
            .select_related("client")
            .order_by("-id")[:20]
        )
        debtors_payload = [
            {
                "membership_id": m.id,
                "client_id": m.client_id,
                "client_name": m.client.full_name,
                "phone": m.client.phone,
                "title": m.title or (m.item.title if m.item_id else ""),
                "expected": str(m.expected_amount),
                "paid": str(m.paid_amount),
                "debt": str(m.debt_amount),
                "end_date": m.end_date.isoformat() if m.end_date else None,
            }
            for m in debtors
        ]

        expiring_list = (
            memberships_qs.filter(
                status=ClientMembership.Status.ACTIVE,
                end_date__isnull=False,
                end_date__gte=today,
                end_date__lte=today + timedelta(days=7),
            )
            .select_related("client")
            .order_by("end_date")[:20]
        )
        expiring_payload = [
            {
                "membership_id": m.id,
                "client_id": m.client_id,
                "client_name": m.client.full_name,
                "phone": m.client.phone,
                "title": m.title or (m.item.title if m.item_id else ""),
                "end_date": m.end_date.isoformat() if m.end_date else None,
                "days_left": (m.end_date - today).days if m.end_date else None,
            }
            for m in expiring_list
        ]

        return Response(
            {
                "business_id": business_id_i,
                "month": f"{first.year:04d}-{first.month:02d}",
                "today": today.isoformat(),
                "clients_total": clients_qs.count(),
                "clients_daily": clients_map.get(BusinessClient.ClientType.DAILY, 0),
                "clients_monthly": clients_map.get(BusinessClient.ClientType.MONTHLY, 0),
                "active_monthly": active_monthly,
                "active_daily": active_daily,
                "active_memberships": active_memberships,
                "expiring_soon": expiring_soon,
                "expired_memberships": expired,
                "expected_total": str(expected_total),
                "paid_total": str(paid_total),
                "debt_total": str(debt_total),
                "month_paid": str(month_paid),
                "month_payments_count": month_payments_count,
                "month_daily_revenue": str(daily_revenue_month),
                "today_attendance": today_attendance,
                "month_attendance": month_attendance,
                "debtors": debtors_payload,
                "expiring": expiring_payload,
            }
        )
