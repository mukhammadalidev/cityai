from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.catalog.models import Item

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
    FitnessClassEnrollment,
    FitnessClassSession,
    FitnessTrainer,
)

PLAN_MONTHS = {
    ClientMembership.PlanType.MONTH_1: 1,
    ClientMembership.PlanType.MONTH_3: 3,
    ClientMembership.PlanType.MONTH_6: 6,
    ClientMembership.PlanType.MONTH_12: 12,
}


class BusinessClientSerializer(serializers.ModelSerializer):
    active_memberships_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_debt = serializers.SerializerMethodField()
    last_visit_date = serializers.SerializerMethodField()
    visits_this_month = serializers.SerializerMethodField()
    portal_username = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    class Meta:
        model = BusinessClient
        fields = [
            "id",
            "business",
            "full_name",
            "phone",
            "telegram_username",
            "gender",
            "birth_date",
            "photo",
            "photo_url",
            "emergency_contact",
            "joined_date",
            "client_type",
            "status",
            "note",
            "announcement",
            "metadata",
            "created_at",
            "updated_at",
            "active_memberships_count",
            "total_paid",
            "total_debt",
            "last_visit_date",
            "visits_this_month",
            "portal_username",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_portal_username(self, obj):
        from apps.accounts.models import User

        return User.objects.filter(portal_business_client=obj).values_list("username", flat=True).first()

    def get_active_memberships_count(self, obj):
        cached = getattr(obj, "active_memberships_count_cached", None)
        if cached is not None:
            return cached
        return obj.memberships.filter(status=ClientMembership.Status.ACTIVE).count()

    def get_total_paid(self, obj):
        cached = getattr(obj, "total_paid_cached", None)
        if cached is not None:
            return cached
        return sum((p.amount for p in obj.payments.all()), Decimal("0"))

    def get_total_debt(self, obj):
        cached = getattr(obj, "total_debt_cached", None)
        if cached is not None:
            return cached
        return sum((m.debt_amount for m in obj.memberships.all()), Decimal("0"))

    def get_last_visit_date(self, obj):
        att = obj.attendances.order_by("-visit_date", "-id").first()
        return att.visit_date if att else None

    def get_visits_this_month(self, obj):
        today = timezone.localdate()
        first = today.replace(day=1)
        return obj.attendances.filter(visit_date__gte=first, status=ClientAttendance.Status.PRESENT).count()


class ClientMembershipSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    client_type = serializers.CharField(source="client.client_type", read_only=True)
    item_title = serializers.CharField(source="item.title", read_only=True)
    debt_amount = serializers.SerializerMethodField()
    remaining_days = serializers.SerializerMethodField()
    member = serializers.PrimaryKeyRelatedField(source="client", queryset=BusinessClient.objects.all())

    class Meta:
        model = ClientMembership
        fields = [
            "id",
            "business",
            "client",
            "member",
            "client_name",
            "client_phone",
            "client_type",
            "item",
            "item_title",
            "plan_type",
            "plan_name",
            "title",
            "start_date",
            "end_date",
            "price",
            "expected_amount",
            "paid_amount",
            "currency",
            "sessions_total",
            "sessions_used",
            "status",
            "payment_status",
            "note",
            "metadata",
            "debt_amount",
            "remaining_days",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_debt_amount(self, obj):
        return obj.debt_amount

    def get_remaining_days(self, obj):
        return obj.remaining_days

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if client and business and client.business_id != business.id:
            raise serializers.ValidationError("Klient va biznes mos kelmaydi.")
        item = attrs.get("item")
        if item and business and item.business_id != business.id:
            raise serializers.ValidationError("Abonement (item) va biznes mos kelmaydi.")
        return attrs

    def _apply_plan_defaults(self, validated_data):
        plan_type = validated_data.get("plan_type") or ClientMembership.PlanType.MONTH_1
        if not validated_data.get("plan_name"):
            validated_data["plan_name"] = dict(ClientMembership.PlanType.choices).get(plan_type, "Abonement")
        if not validated_data.get("title"):
            validated_data["title"] = validated_data["plan_name"]
        price = validated_data.get("price") or validated_data.get("expected_amount")
        if price and not validated_data.get("expected_amount"):
            validated_data["expected_amount"] = price
        if price and not validated_data.get("price"):
            validated_data["price"] = price
        start = validated_data.get("start_date") or timezone.localdate()
        if not validated_data.get("end_date") and plan_type in PLAN_MONTHS:
            import calendar
            from datetime import date

            months = PLAN_MONTHS[plan_type]
            month = start.month - 1 + months
            year = start.year + month // 12
            month = month % 12 + 1
            day = min(start.day, calendar.monthrange(year, month)[1])
            validated_data["end_date"] = date(year, month, day)
        return validated_data

    def create(self, validated_data):
        validated_data = self._apply_plan_defaults(validated_data)
        item: Item | None = validated_data.get("item")
        if item and not validated_data.get("expected_amount"):
            validated_data["expected_amount"] = item.price or Decimal("0")
        if item and not validated_data.get("price"):
            validated_data["price"] = item.price or Decimal("0")
        if item and not validated_data.get("currency"):
            validated_data["currency"] = item.currency or "UZS"
        instance = super().create(validated_data)
        instance.sync_status_from_dates()
        instance.recalc_payment_status()
        instance.save(update_fields=["status", "payment_status"])
        return instance

    def update(self, instance, validated_data):
        validated_data = self._apply_plan_defaults(validated_data)
        instance = super().update(instance, validated_data)
        instance.sync_status_from_dates()
        instance.recalc_payment_status()
        instance.save(update_fields=["status", "payment_status"])
        return instance


class ClientPaymentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    membership_title = serializers.SerializerMethodField()
    member = serializers.PrimaryKeyRelatedField(source="client", queryset=BusinessClient.objects.all())
    subscription = serializers.PrimaryKeyRelatedField(
        source="membership", queryset=ClientMembership.objects.all(), allow_null=True, required=False
    )
    paid_date = serializers.DateField(source="payment_date")
    payment_method = serializers.ChoiceField(source="method", choices=ClientPayment.Method.choices)

    class Meta:
        model = ClientPayment
        fields = [
            "id",
            "business",
            "client",
            "member",
            "membership",
            "subscription",
            "client_name",
            "membership_title",
            "amount",
            "currency",
            "payment_date",
            "paid_date",
            "method",
            "payment_method",
            "status",
            "comment",
            "note",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_membership_title(self, obj):
        if obj.membership_id and obj.membership:
            return obj.membership.display_title
        return ""

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if client and business and client.business_id != business.id:
            raise serializers.ValidationError("Klient va biznes mos kelmaydi.")
        membership = attrs.get("membership")
        if membership and client and membership.client_id != client.id:
            raise serializers.ValidationError("To'lov klient va abonement bir-biriga mos emas.")
        return attrs


class ClientAttendanceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    client_type_resolved = serializers.SerializerMethodField()
    membership_title = serializers.SerializerMethodField()
    member = serializers.PrimaryKeyRelatedField(source="client", queryset=BusinessClient.objects.all())
    date = serializers.DateField(source="visit_date")

    class Meta:
        model = ClientAttendance
        fields = [
            "id",
            "business",
            "client",
            "member",
            "client_name",
            "client_phone",
            "membership",
            "membership_title",
            "visit_date",
            "date",
            "visit_time",
            "check_in_time",
            "check_out_time",
            "status",
            "client_type",
            "client_type_resolved",
            "amount_charged",
            "currency",
            "note",
            "metadata",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")

    def get_client_type_resolved(self, obj):
        return obj.client_type or (obj.client.client_type if obj.client_id else "")

    def get_membership_title(self, obj):
        if obj.membership_id and obj.membership:
            return obj.membership.display_title
        return ""

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if client and business and client.business_id != business.id:
            raise serializers.ValidationError("Klient va biznes mos kelmaydi.")
        if client and not attrs.get("client_type"):
            attrs["client_type"] = client.client_type
        if not attrs.get("check_in_time") and attrs.get("status") == ClientAttendance.Status.PRESENT:
            attrs["check_in_time"] = timezone.now()
        if (
            client
            and client.client_type == BusinessClient.ClientType.MONTHLY
            and not attrs.get("membership")
            and not (self.instance and self.instance.membership_id)
        ):
            active = (
                ClientMembership.objects.filter(client=client, status=ClientMembership.Status.ACTIVE)
                .order_by("-start_date", "-id")
                .first()
            )
            if active:
                attrs["membership"] = active
        return attrs


class FitnessTrainerSerializer(serializers.ModelSerializer):
    photo_url = serializers.SerializerMethodField()
    sessions_count = serializers.SerializerMethodField()

    class Meta:
        model = FitnessTrainer
        fields = [
            "id",
            "business",
            "full_name",
            "phone",
            "specialization",
            "photo",
            "photo_url",
            "salary_type",
            "salary_amount",
            "status",
            "note",
            "sessions_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_photo_url(self, obj):
        if obj.photo:
            request = self.context.get("request")
            if request:
                return request.build_absolute_uri(obj.photo.url)
            return obj.photo.url
        return None

    def get_sessions_count(self, obj):
        return obj.sessions.count()


class FitnessClassEnrollmentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)

    class Meta:
        model = FitnessClassEnrollment
        fields = ["id", "session", "client", "client_name", "client_phone", "created_at"]
        read_only_fields = ("id", "created_at")


class FitnessClassSessionSerializer(serializers.ModelSerializer):
    trainer_name = serializers.CharField(source="trainer.full_name", read_only=True)
    current_members = serializers.IntegerField(read_only=True)
    enrollments = FitnessClassEnrollmentSerializer(many=True, read_only=True)
    date = serializers.DateField(source="session_date")

    class Meta:
        model = FitnessClassSession
        fields = [
            "id",
            "business",
            "trainer",
            "trainer_name",
            "title",
            "session_type",
            "session_date",
            "date",
            "start_time",
            "end_time",
            "max_members",
            "current_members",
            "status",
            "note",
            "enrollments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")
