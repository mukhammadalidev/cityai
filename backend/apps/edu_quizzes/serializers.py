from rest_framework import serializers

from apps.businesses.models import Business

from .models import EduQuiz, EduQuizCategory, EduQuizQuestion


class EduQuizCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EduQuizCategory
        fields = ("id", "business", "name", "created_at")
        read_only_fields = ("id", "created_at")


class EduQuizQuestionReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = EduQuizQuestion
        fields = ("id", "sort_order", "prompt", "options", "correct_index")


class EduQuizQuestionWriteSerializer(serializers.Serializer):
    prompt = serializers.CharField(max_length=4000)
    options = serializers.ListField(child=serializers.CharField(max_length=500), min_length=2, max_length=16)
    correct_index = serializers.IntegerField(min_value=0)
    sort_order = serializers.IntegerField(required=False, min_value=0, default=0)

    def validate(self, attrs):
        opts = attrs.get("options") or []
        ci = attrs.get("correct_index", 0)
        if ci >= len(opts):
            raise serializers.ValidationError({"correct_index": "Javob indeksi variantlar oralig‘ida bo‘lishi kerak."})
        return attrs


class EduQuizListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    question_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = EduQuiz
        fields = (
            "id",
            "business",
            "category",
            "category_name",
            "assessment_type",
            "title",
            "description",
            "time_limit_minutes",
            "is_published",
            "question_count",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "business",
            "category",
            "category_name",
            "assessment_type",
            "title",
            "description",
            "time_limit_minutes",
            "is_published",
            "question_count",
            "created_at",
            "updated_at",
        )


class EduQuizDetailSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    questions = EduQuizQuestionReadSerializer(many=True, read_only=True)

    class Meta:
        model = EduQuiz
        fields = (
            "id",
            "business",
            "category",
            "category_name",
            "assessment_type",
            "title",
            "description",
            "time_limit_minutes",
            "is_published",
            "questions",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class EduQuizWriteSerializer(serializers.ModelSerializer):
    questions = EduQuizQuestionWriteSerializer(many=True, required=False)

    class Meta:
        model = EduQuiz
        fields = (
            "business",
            "category",
            "assessment_type",
            "title",
            "description",
            "time_limit_minutes",
            "is_published",
            "questions",
        )

    def validate_time_limit_minutes(self, value):
        if value is not None and (value < 1 or value > 480):
            raise serializers.ValidationError("Vaqt 1–480 daqiqa oralig‘ida bo‘lishi kerak.")
        return value

    def validate(self, attrs):
        biz: Business = attrs.get("business") or (self.instance.business if self.instance else None)
        if not biz:
            raise serializers.ValidationError({"business": "Biznes ko‘rsatilmagan."})
        if biz.business_type != Business.BusinessType.EDUCATION_CENTER:
            raise serializers.ValidationError("Faqat o‘quv markazi uchun.")
        cat = attrs.get("category") or (self.instance.category if self.instance else None)
        if cat and cat.business_id != biz.id:
            raise serializers.ValidationError({"category": "Kategoriya boshqa markazga tegishli."})
        if self.instance is None:
            q = attrs.get("questions")
            if not q:
                raise serializers.ValidationError({"questions": "Kamida bitta savol kerak."})
        return attrs

    def create(self, validated_data):
        questions_data = validated_data.pop("questions")
        quiz = EduQuiz.objects.create(**validated_data)
        self._save_questions(quiz, questions_data)
        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop("questions", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if questions_data is not None:
            if not questions_data:
                raise serializers.ValidationError({"questions": "Kamida bitta savol kerak."})
            instance.questions.all().delete()
            self._save_questions(instance, questions_data)
        return instance

    @staticmethod
    def _save_questions(quiz: EduQuiz, questions_data: list) -> None:
        if not questions_data:
            raise serializers.ValidationError({"questions": "Kamida bitta savol kerak."})
        bulk = [
            EduQuizQuestion(
                quiz=quiz,
                sort_order=q.get("sort_order", 0),
                prompt=q["prompt"],
                options=q["options"],
                correct_index=q["correct_index"],
            )
            for q in questions_data
        ]
        EduQuizQuestion.objects.bulk_create(bulk)
