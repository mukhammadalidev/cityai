import json

from rest_framework import serializers

from .models import Attendance


class HikvisionEventInSerializer(serializers.Serializer):
    """Hikvision listener yuboradigan minimal yuk."""

    employee_no = serializers.CharField(max_length=50, trim_whitespace=True)
    event_time = serializers.DateTimeField()
    device_ip = serializers.CharField(max_length=45, required=False, allow_blank=True, default="")
    raw_data = serializers.JSONField(required=False, default=dict)

    def validate_employee_no(self, value: str) -> str:
        v = (value or "").strip()
        if not v:
            raise serializers.ValidationError("employee_no bo‘sh bo‘lmasligi kerak.")
        return v

    def validate_raw_data(self, value):
        if value is None:
            return {}
        try:
            s = json.dumps(value, default=str)
        except (TypeError, ValueError):
            raise serializers.ValidationError("raw_data JSON-serializatsiya qilinadigan obyekt bo‘lishi kerak.")
        if len(s) > 50000:
            raise serializers.ValidationError("raw_data juda katta (max ~50KB).")
        return value


class AttendanceSerializer(serializers.ModelSerializer):
    """DRF javoblari va admin API uchun yozuv ko‘rinishi."""

    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = Attendance
        fields = (
            "id",
            "student",
            "student_name",
            "status",
            "event_time",
            "device_ip",
            "employee_no",
            "raw_data",
            "created_at",
        )
        read_only_fields = fields
