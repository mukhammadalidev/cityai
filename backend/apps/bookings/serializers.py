from rest_framework import serializers

from .models import Booking


class BookingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=255, required=True, allow_blank=False)
    phone = serializers.CharField(max_length=30, required=True, allow_blank=False)
    preferred_date = serializers.DateField(required=True)
    preferred_time = serializers.TimeField(required=True)
    note = serializers.CharField(required=False, allow_blank=True)
    metadata = serializers.JSONField(required=False, default=dict)

    class Meta:
        model = Booking
        fields = "__all__"
        read_only_fields = ("id", "created_at")

    def validate(self, attrs):
        booking_type = attrs.get("booking_type") or (
            self.instance.booking_type if self.instance else Booking.BookingType.TABLE_BOOKING
        )
        if booking_type == Booking.BookingType.TABLE_BOOKING:
            guests = attrs.get("guests_count")
            if guests is None and (not self.instance or self.instance.guests_count is None):
                raise serializers.ValidationError(
                    {"guests_count": "Stol bron uchun kishi soni majburiy."}
                )
            if guests is not None and guests <= 0:
                raise serializers.ValidationError(
                    {"guests_count": "Kishi soni 0 dan katta bo‘lishi kerak."}
                )
        return attrs
