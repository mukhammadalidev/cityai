from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .portal_views import (
    BusinessClientPortalSummaryView,
    CreateBusinessClientPortalView,
    CreateEduPortalUserView,
    ParentPortalSummaryView,
    ResetBusinessClientPortalView,
    StudentPortalSummaryView,
    StudentQuizSubmitView,
    TeacherPortalSummaryView,
)
from .views import LoginView, ManagerListView, MeView, RegisterBusinessOwnerView

urlpatterns = [
    path("register/", RegisterBusinessOwnerView.as_view(), name="register_business_owner"),
    path("login/", LoginView.as_view(), name="token_obtain_pair"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("managers/", ManagerListView.as_view(), name="managers"),
    path("portal/education/create-user/", CreateEduPortalUserView.as_view(), name="edu_portal_create_user"),
    path("portal/education/teacher-summary/", TeacherPortalSummaryView.as_view(), name="edu_teacher_portal"),
    path("portal/education/student-summary/", StudentPortalSummaryView.as_view(), name="edu_student_portal"),
    path("portal/education/student-quiz-submit/", StudentQuizSubmitView.as_view(), name="edu_student_quiz_submit"),
    path("portal/education/parent-summary/", ParentPortalSummaryView.as_view(), name="edu_parent_portal"),
    path("portal/fitness/me/", BusinessClientPortalSummaryView.as_view(), name="fitness_client_portal"),
    path("portal/business-client/create/", CreateBusinessClientPortalView.as_view(), name="business_client_portal_create"),
    path("portal/business-client/reset/", ResetBusinessClientPortalView.as_view(), name="business_client_portal_reset"),
]
