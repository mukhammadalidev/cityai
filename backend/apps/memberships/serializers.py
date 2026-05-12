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
    portal_username = serializers.SerializerMethodField()

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
        if not validated_data.get("title"):
            validated_data["title"] = "Abonement"
        instance = super().create(validated_data)
        instance.recalc_payment_status()
        instance.save(update_fields=["payment_status"])
        return instance

    def update(self, instance, validated_data):
        item = validated_data.get("item", instance.item)
        if item and not validated_data.get("title") and not instance.title:
            validated_data["title"] = item.title
        if not validated_data.get("title") and not instance.title:
            validated_data["title"] = "Abonement"
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
    client_type_resolved = serializers.SerializerMethodField()
    membership_title = serializers.SerializerMethodField()

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
            "client_type_resolved",
            "amount_charged",
            "currency",
            "note",
            "metadata",
            "created_at",
        ]
        read_only_fields = ("id", "created_at")

    def get_client_type_resolved(self, obj):
        if obj.client_type:
            return obj.client_type
        return obj.client.client_type if obj.client_id else ""

    def get_membership_title(self, obj):
        if obj.membership_id and obj.membership and obj.membership.title:
            return obj.membership.title
        if obj.membership_id and obj.membership and obj.membership.item_id:
            return obj.membership.item.title
        # Fallback: klientning hozirgi faol abonementi
        if obj.client_id:
            active = (
                ClientMembership.objects
                .filter(client_id=obj.client_id, status=ClientMembership.Status.ACTIVE)
                .order_by("-start_date", "-id")
                .first()
            )
            if active:
                if active.title:
                    return active.title
                if active.item_id:
                    return active.item.title
        return ""

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
        # Oylik klient uchun abonement tanlanmagan bo'lsa, faol abonementni avtomatik biriktirish
        if (
            client
            and client.client_type == BusinessClient.ClientType.MONTHLY
            and not attrs.get("membership")
            and not (self.instance and self.instance.membership_id)
        ):
            active = (
                ClientMembership.objects
                .filter(client=client, status=ClientMembership.Status.ACTIVE)
                .order_by("-start_date", "-id")
                .first()
            )
            if active:
                attrs["membership"] = active
        return attrs
