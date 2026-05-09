from datetime import date

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APITestCase

from apps.businesses.models import Business
from apps.catalog.models import Item
from apps.city.models import City
from apps.service_categories.models import ServiceCategory
from apps.subscriptions.models import BusinessSubscription, SubscriptionPlan
from apps.subscriptions.services import assert_under_item_limit


class SubscriptionFeatureGuardsTests(APITestCase):
    def setUp(self):
        self.user_model = get_user_model()
        self.owner = self.user_model.objects.create_user(
            username="owner1",
            password="pass12345",
            role=self.user_model.Role.BUSINESS_OWNER,
        )
        self.city = City.objects.create(name="Buxoro")
        self.category = ServiceCategory.objects.create(
            city=self.city,
            name="Restoran",
            category_type=ServiceCategory.CategoryType.RESTAURANT,
        )
        self.business = Business.objects.create(
            owner=self.owner,
            city=self.city,
            category=self.category,
            name="Test Biznes",
            business_type=Business.BusinessType.RESTAURANT,
            status=Business.Status.ACTIVE,
        )
        self.client.force_authenticate(self.owner)

    def _attach_plan(self, **plan_flags):
        defaults = {
            "name": "Demo plan",
            "code": SubscriptionPlan.Code.DEMO,
            "max_items": 1,
            "has_ai_chat": False,
            "has_analytics": False,
            "has_marketing_generator": False,
            "has_edu_materials": False,
            "has_edu_attendance": False,
            "has_edu_portals": False,
        }
        defaults.update(plan_flags)
        plan = SubscriptionPlan.objects.create(**defaults)
        BusinessSubscription.objects.create(
            business=self.business,
            plan=plan,
            status=BusinessSubscription.Status.ACTIVE,
            start_date=date.today(),
        )
        return plan

    def test_marketing_generate_returns_403_when_feature_disabled(self):
        self._attach_plan(has_marketing_generator=False)

        resp = self.client.post(
            "/api/marketing/generate/",
            {"business_id": self.business.id, "prompt": "Aksiya matni"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("Marketing generator", str(resp.data.get("detail", "")))

    def test_knowledge_create_returns_403_when_ai_chat_disabled(self):
        self._attach_plan(has_ai_chat=False)

        resp = self.client.post(
            "/api/knowledge/",
            {"business": self.business.id, "title": "FAQ", "content": "Javoblar"},
            format="json",
        )

        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("AI bilim bazasi", str(resp.data.get("detail", "")))

    def test_business_analytics_returns_403_when_feature_disabled(self):
        self._attach_plan(has_analytics=False)

        resp = self.client.get(f"/api/analytics/business/{self.business.id}/")

        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn("analitika", str(resp.data.get("detail", "")).lower())

    def test_item_create_is_blocked_when_item_limit_reached(self):
        self._attach_plan(max_items=1)
        Item.objects.create(business=self.business, title="Burger", price=20000)
        with self.assertRaises(PermissionDenied):
            assert_under_item_limit(self.business.id, self.owner)

    def test_lead_create_is_public_and_creates_record(self):
        self.client.force_authenticate(user=None)
        plan = self._attach_plan()
        self.assertIsNotNone(plan)

        payload = {
            "city": self.city.id,
            "business": self.business.id,
            "name": "Ali",
            "phone": "+998901112233",
            "message": "Narxlar haqida",
            "source": "instagram",
        }
        resp = self.client.post("/api/leads/", payload, format="json")

        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["phone"], payload["phone"])
