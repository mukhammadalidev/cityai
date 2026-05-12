from decimal import Decimal

from rest_framework import serializers

from apps.catalog.models import Item

from .models import (
    BusinessClient,
    ClientAttendance,
    ClientMembership,
    ClientPayment,
)


class BusinessClientSerializer(serializers.ModelSerializer):
    active_memberships_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    total_debt = serializers.SerializerMethodField()
    last_visit_date = serializers.SerializerMethodField()
    visits_this_month = serializers.SerializerMethodField()

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
            "client_type",
            "status",
            "note",
            "metadata",
            "created_at",
            "updated_at",
            "active_memberships_count",
            "total_paid",
            "total_debt",
            "last_visit_date",
            "visits_this_month",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

    def get_active_memberships_count(self, obj):
        cached = getattr(obj, "active_memberships_count_cached", None)
        if cached is not None:
            return cached
        return obj.memberships.filter(status=ClientMembership.Status.ACTIVE).count()

    def get_total_paid(self, obj):
        cached = getattr(obj, "total_paid_cached", None)
        if cached is not None:
            return cached
        total = sum(
            (p.amount for p in obj.payments.all()),
            Decimal("0"),
        )
        return total

    def get_total_debt(self, obj):
        cached = getattr(obj, "total_debt_cached", None)
        if cached is not None:
            return cached
        debt = Decimal("0")
        for m in obj.memberships.all():
            debt += m.debt_amount
        return debt

    def get_last_visit_date(self, obj):
        cached = getattr(obj, "last_visit_date_cached", None)
        if cached is not None:
            return cached
        att = obj.attendances.order_by("-visit_date", "-id").first()
        return att.visit_date if att else None

    def get_visits_this_month(self, obj):
        cached = getattr(obj, "visits_this_month_cached", None)
        if cached is not None:
            return cached
        return 0


class ClientMembershipSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    client_phone = serializers.CharField(source="client.phone", read_only=True)
    client_type = serializers.CharField(source="client.client_type", read_only=True)
    item_title = serializers.CharField(source="item.title", read_only=True)
    debt_amount = serializers.SerializerMethodField()

    class Meta:
        model = ClientMembership
        fields = [
            "id",
            "business",
            "client",
            "client_name",
            "client_phone",
            "client_type",
            "item",
            "item_title",
            "title",
            "start_date",
            "end_date",
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at", "payment_status", "paid_amount")

    def get_debt_amount(self, obj):
        return obj.debt_amount

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if client and business and client.business_id != business.id:
            raise serializers.ValidationError("Klient va biznes mos kelmaydi.")
        item = attrs.get("item")
        if item and business and item.business_id != business.id:
            raise serializers.ValidationError("Abonement (item) va biznes mos kelmaydi.")
        return attrs

    def create(self, validated_data):
        item: Item | None = validated_data.get("item")
        if item and not validated_data.get("title"):
            validated_data["title"] = item.title
        if item and not validated_data.get("expected_amount"):
            validated_data["expected_amount"] = item.price or Decimal("0")
        if item and not validated_data.get("currency"):
            validated_data["currency"] = item.currency or "UZS"
        instance = super().create(validated_data)
        instance.recalc_payment_status()
        instance.save(update_fields=["payment_status"])
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        instance.recalc_payment_status()
        instance.save(update_fields=["payment_status"])
        return instance


class ClientPaymentSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source="client.full_name", read_only=True)
    membership_title = serializers.CharField(source="membership.title", read_only=True)

    class Meta:
        model = ClientPayment
        fields = [
            "id",
            "business",
            "client",
            "client_name",
            "membership",
            "membership_title",
            "amount",
            "currency",
            "payment_date",
            "method",
            "note",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("id", "created_at", "updated_at")

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
    membership_title = serializers.CharField(source="membership.title", read_only=True)

    class Meta:
        model = ClientAttendance
        fields = [
            "id",
            "business",
            "client",
            "client_name",
            "client_phone",
            "membership",
            "membership_title",
            "visit_date",
            "visit_time",
            "client_type",
            "amount_charged",
            "currency",
            "note",
            "metadata",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        client = attrs.get("client") or getattr(self.instance, "client", None)
        business = attrs.get("business") or getattr(self.instance, "business", None)
        if client and business and client.business_id != business.id:
            raise serializers.ValidationError("Klient va biznes mos kelmaydi.")
        membership = attrs.get("membership")
        if membership and client and membership.client_id != client.id:
            raise serializers.ValidationError("Davomat klient va abonementga mos emas.")
        if client and not attrs.get("client_type"):
            attrs["client_type"] = client.client_type
        return attrs
