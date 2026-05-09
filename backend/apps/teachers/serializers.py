from rest_framework import serializers

from apps.accounts.models import User
from apps.students.models import Student

from .models import Teacher


class TeacherSerializer(serializers.ModelSerializer):
    groups_count = serializers.SerializerMethodField()
    students_in_groups_count = serializers.SerializerMethodField()
    portal_username = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = "__all__"
        read_only_fields = ("id", "created_at", "updated_at")

    def get_portal_username(self, obj):
        return User.objects.filter(portal_teacher=obj).values_list("username", flat=True).first()

    def get_groups_count(self, obj):
        if getattr(obj, "groups_count", None) is not None:
            return obj.groups_count
        return obj.student_groups.count()

    def get_students_in_groups_count(self, obj):
        if getattr(obj, "students_in_groups_count", None) is not None:
            return obj.students_in_groups_count
        if not obj.pk:
            return 0
        return Student.objects.filter(group__teacher_id=obj.pk).count()
