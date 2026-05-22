from decimal import Decimal

from rest_framework import serializers

from .models import Student, StudentMonthlyPayment
from .monthly_payment_utils import default_monthly_amount_for_student


class StudentMonthlyPaymentSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    group_name = serializers.CharField(source="group.name", read_only=True, default="")
    course_title = serializers.CharField(source="course.title", read_only=True, default="")

    class Meta:
        model = StudentMonthlyPayment
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_month(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Oy 1–12 orasida bo'lishi kerak.")
        return value

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        business = attrs.get("business", getattr(self.instance, "business", None))
        if student and business and student.business_id != business.id:
            raise serializers.ValidationError({"student": "O'quvchi boshqa biznesga tegishli."})
        group = attrs.get("group", getattr(self.instance, "group", None))
        if group and student and group.business_id != student.business_id:
            raise serializers.ValidationError({"group": "Guruh boshqa biznesga tegishli."})
        return attrs


class StudentMonthlyPaymentBulkSerializer(serializers.Serializer):
    business = serializers.IntegerField()
    student = serializers.IntegerField()
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    paid_amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False, allow_null=True)
    status = serializers.ChoiceField(choices=StudentMonthlyPayment.Status.choices)
    note = serializers.CharField(required=False, allow_blank=True, default="")
    group = serializers.IntegerField(required=False, allow_null=True)
    course = serializers.IntegerField(required=False, allow_null=True)

    def validate_month(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError("Oy 1–12 orasida bo'lishi kerak.")
        return value

    def create_or_update(self):
        data = self.validated_data
        student = Student.objects.select_related("course", "group", "group__course").get(
            pk=data["student"], business_id=data["business"]
        )
        defaults = {
            "business_id": data["business"],
            "group_id": data.get("group") or student.group_id,
            "course_id": data.get("course") or student.course_id,
            "status": data["status"],
            "note": (data.get("note") or "").strip(),
            "paid_at": None,
        }
        amount = data.get("amount")
        if amount is None:
            amount = default_monthly_amount_for_student(student)
        defaults["amount"] = amount

        paid_amount = data.get("paid_amount")
        if paid_amount is None:
            if data["status"] == StudentMonthlyPayment.Status.PAID:
                paid_amount = amount
            elif data["status"] == StudentMonthlyPayment.Status.PARTIAL:
                paid_amount = Decimal("0")
            else:
                paid_amount = Decimal("0")
        defaults["paid_amount"] = paid_amount

        obj, _created = StudentMonthlyPayment.objects.update_or_create(
            student=student,
            year=data["year"],
            month=data["month"],
            defaults=defaults,
        )
        return obj
