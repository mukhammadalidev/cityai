from rest_framework import serializers

from apps.accounts.models import User

from .models import Student, StudentAttendance, StudentGroup, StudentRating


class StudentGroupSerializer(serializers.ModelSerializer):
    student_count = serializers.SerializerMethodField()
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True, default="")

    class Meta:
        model = StudentGroup
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_student_count(self, obj):
        if getattr(obj, "student_count", None) is not None:
            return obj.student_count
        return obj.students.count()

    def validate(self, attrs):
        business = attrs.get("business", getattr(self.instance, "business", None))
        course = attrs.get("course", getattr(self.instance, "course", None))
        teacher = attrs.get("teacher", getattr(self.instance, "teacher", None))
        if course and business and course.business_id != business.id:
            raise serializers.ValidationError({"course": "Kurs boshqa biznesga tegishli."})
        if teacher and business and teacher.business_id != business.id:
            raise serializers.ValidationError({"teacher": "Ustoz boshqa biznesga tegishli."})
        return attrs


class StudentSerializer(serializers.ModelSerializer):
    course_title = serializers.CharField(source="course.title", read_only=True, default="")
    group_name = serializers.CharField(source="group.name", read_only=True, default="")
    portal_username = serializers.SerializerMethodField()
    parent_portal_usernames = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_portal_username(self, obj):
        return User.objects.filter(portal_student=obj).values_list("username", flat=True).first()

    def get_parent_portal_usernames(self, obj):
        return list(
            User.objects.filter(portal_parent=obj, role=User.Role.EDU_PARENT)
            .values_list("username", flat=True)
            .order_by("username")
        )

    def validate(self, attrs):
        group = attrs.get("group", getattr(self.instance, "group", None) if self.instance else None)
        business = attrs.get("business", getattr(self.instance, "business", None) if self.instance else None)
        if group and business and group.business_id != business.id:
            raise serializers.ValidationError({"group": "Guruh boshqa biznesga tegishli."})
        return attrs


class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = StudentAttendance
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")


class StudentRatingSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = StudentRating
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_points(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError("Ball 0–100 orasida bo‘lishi kerak.")
        return value
