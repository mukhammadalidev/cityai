import { Suspense, lazy } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";
import AdminLayout from "../layouts/AdminLayout";
import BusinessLayout from "../layouts/BusinessLayout";
import PortalLayout from "../layouts/PortalLayout";
import PublicLayout from "../layouts/PublicLayout";
import LoadingScreen from "../components/ui/LoadingScreen";
import ProtectedRoute from "./ProtectedRoute";
import RoleRoute from "./RoleRoute";

const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
const PlatformDashboardPage = lazy(() => import("../pages/admin/PlatformDashboardPage"));
const CitiesPage = lazy(() => import("../pages/admin/CitiesPage"));
const ServiceCategoriesPage = lazy(() => import("../pages/admin/ServiceCategoriesPage"));
const BusinessesPage = lazy(() => import("../pages/admin/BusinessesPage"));
const BusinessDetailPage = lazy(() => import("../pages/admin/BusinessDetailPage"));
const SubscriptionsPage = lazy(() => import("../pages/admin/SubscriptionsPage"));
const InvoicesPage = lazy(() => import("../pages/admin/InvoicesPage"));
const PlatformAnalyticsPage = lazy(() => import("../pages/admin/PlatformAnalyticsPage"));
const PlatformSettingsPage = lazy(() => import("../pages/admin/PlatformSettingsPage"));
const BusinessSelectPage = lazy(() => import("../pages/business/BusinessSelectPage"));
const BusinessDashboardPage = lazy(() => import("../pages/business/BusinessDashboardPage"));
const ItemsPage = lazy(() => import("../pages/business/ItemsPage"));
const ItemFormPage = lazy(() => import("../pages/business/ItemFormPage"));
const ItemDetailPage = lazy(() => import("../pages/business/ItemDetailPage"));
const LeadsPage = lazy(() => import("../pages/business/LeadsPage"));
const StudentsPage = lazy(() => import("../pages/business/StudentsPage"));
const StudentPaymentsPage = lazy(() => import("../pages/business/StudentPaymentsPage"));
const EduReportsPage = lazy(() => import("../pages/business/EduReportsPage"));
const StudentDetailPage = lazy(() => import("../pages/business/StudentDetailPage"));
const StudentGroupsPage = lazy(() => import("../pages/business/StudentGroupsPage"));
const StudentRatingsPage = lazy(() => import("../pages/business/StudentRatingsPage"));
const TeachersPage = lazy(() => import("../pages/business/TeachersPage"));
const TeacherDetailPage = lazy(() => import("../pages/business/TeacherDetailPage"));
const MaterialsPage = lazy(() => import("../pages/business/MaterialsPage"));
const EduQuizzesPage = lazy(() => import("../pages/business/EduQuizzesPage"));
const BookingsPage = lazy(() => import("../pages/business/BookingsPage"));
const FitnessClientsPage = lazy(() => import("../pages/business/FitnessClientsPage"));
const FitnessAttendancePage = lazy(() => import("../pages/business/FitnessAttendancePage"));
const FitnessPaymentsPage = lazy(() => import("../pages/business/FitnessPaymentsPage"));
const FitnessAbonementsPage = lazy(() => import("../pages/business/FitnessAbonementsPage"));
const FitnessGuidePage = lazy(() => import("../pages/business/FitnessGuidePage"));
const FitnessDashboardPage = lazy(() => import("../pages/business/FitnessDashboardPage"));
const FitnessMemberDetailPage = lazy(() => import("../pages/business/FitnessMemberDetailPage"));
const FitnessSubscriptionsPage = lazy(() => import("../pages/business/FitnessSubscriptionsPage"));
const FitnessDebtorsPage = lazy(() => import("../pages/business/FitnessDebtorsPage"));
const FitnessTrainersPage = lazy(() => import("../pages/business/FitnessTrainersPage"));
const FitnessSchedulePage = lazy(() => import("../pages/business/FitnessSchedulePage"));
const FitnessReportsPage = lazy(() => import("../pages/business/FitnessReportsPage"));
const FitnessSettingsPage = lazy(() => import("../pages/business/FitnessSettingsPage"));
const OrdersPage = lazy(() => import("../pages/business/OrdersPage"));
const KnowledgePage = lazy(() => import("../pages/business/KnowledgePage"));
const ManagersPage = lazy(() => import("../pages/business/ManagersPage"));
const AIUsagePage = lazy(() => import("../pages/business/AIUsagePage"));
const MarketingGeneratorPage = lazy(() => import("../pages/business/MarketingGeneratorPage"));
const BillingPage = lazy(() => import("../pages/business/BillingPage"));
const BusinessSettingsPage = lazy(() => import("../pages/business/BusinessSettingsPage"));
const PortalTeacherPage = lazy(() => import("../pages/portal/PortalTeacherPage"));
const PortalTeacherStudentPage = lazy(() => import("../pages/portal/PortalTeacherStudentPage"));
const PortalStudentPage = lazy(() => import("../pages/portal/PortalStudentPage"));
const PortalParentPage = lazy(() => import("../pages/portal/PortalParentPage"));
const PortalFitnessClientPage = lazy(() => import("../pages/portal/PortalFitnessClientPage"));
const LandingPage = lazy(() => import("../pages/landing/LandingPage"));
const PublicCityPage = lazy(() => import("../pages/public/PublicCityPage"));
const PublicCategoryPage = lazy(() => import("../pages/public/PublicCategoryPage"));
const PublicBusinessPage = lazy(() => import("../pages/public/PublicBusinessPage"));
const NotFoundPage = lazy(() => import("../pages/NotFoundPage"));

const page = (Component) => (
  <Suspense fallback={<LoadingScreen />}>
    <Component />
  </Suspense>
);

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={page(LoginPage)} />
      </Route>

      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route
          path="teacher"
          element={
            <RoleRoute roles={["edu_teacher"]}>
              <Outlet />
            </RoleRoute>
          }
        >
          <Route index element={page(PortalTeacherPage)} />
          <Route path="students/:id" element={page(PortalTeacherStudentPage)} />
        </Route>
        <Route
          path="student"
          element={
            <RoleRoute roles={["edu_student"]}>
              {page(PortalStudentPage)}
            </RoleRoute>
          }
        />
        <Route
          path="parent"
          element={
            <RoleRoute roles={["edu_parent"]}>
              {page(PortalParentPage)}
            </RoleRoute>
          }
        />
        <Route
          path="fitness"
          element={
            <RoleRoute roles={["business_client"]}>
              {page(PortalFitnessClientPage)}
            </RoleRoute>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["super_admin"]}>
              <AdminLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={page(PlatformDashboardPage)} />
        <Route path="cities" element={page(CitiesPage)} />
        <Route path="categories" element={page(ServiceCategoriesPage)} />
        <Route path="businesses" element={page(BusinessesPage)} />
        <Route path="businesses/:id" element={page(BusinessDetailPage)} />
        <Route path="subscriptions" element={page(SubscriptionsPage)} />
        <Route path="invoices" element={page(InvoicesPage)} />
        <Route path="analytics" element={page(PlatformAnalyticsPage)} />
        <Route path="settings" element={page(PlatformSettingsPage)} />
      </Route>

      <Route
        path="/business"
        element={
          <ProtectedRoute>
            <RoleRoute roles={["super_admin", "business_owner", "manager"]}>
              <BusinessLayout />
            </RoleRoute>
          </ProtectedRoute>
        }
      >
        <Route path="select" element={page(BusinessSelectPage)} />
        <Route path="dashboard" element={page(BusinessDashboardPage)} />
        <Route path="items" element={page(ItemsPage)} />
        <Route path="items/new" element={page(ItemFormPage)} />
        <Route path="items/:id/edit" element={page(ItemFormPage)} />
        <Route path="materials" element={page(MaterialsPage)} />
        <Route path="materials/new" element={page(ItemFormPage)} />
        <Route path="materials/:id/edit" element={page(ItemFormPage)} />
        <Route path="edu-quizzes" element={page(EduQuizzesPage)} />
        <Route path="items/:id" element={page(ItemDetailPage)} />
        <Route path="leads" element={page(LeadsPage)} />
        <Route path="students/:id" element={page(StudentDetailPage)} />
        <Route path="students" element={page(StudentsPage)} />
        <Route path="student-payments" element={page(StudentPaymentsPage)} />
        <Route path="edu-reports" element={page(EduReportsPage)} />
        <Route path="student-ratings" element={page(StudentRatingsPage)} />
        <Route path="student-groups" element={page(StudentGroupsPage)} />
        <Route path="teachers/:id" element={page(TeacherDetailPage)} />
        <Route path="teachers" element={page(TeachersPage)} />
        <Route path="bookings" element={page(BookingsPage)} />
        <Route path="fitness/dashboard" element={page(FitnessDashboardPage)} />
        <Route path="fitness/clients" element={page(FitnessClientsPage)} />
        <Route path="fitness/clients/:id" element={page(FitnessMemberDetailPage)} />
        <Route path="fitness/subscriptions" element={page(FitnessSubscriptionsPage)} />
        <Route path="fitness/payments" element={page(FitnessPaymentsPage)} />
        <Route path="fitness/debtors" element={page(FitnessDebtorsPage)} />
        <Route path="fitness/attendance" element={page(FitnessAttendancePage)} />
        <Route path="fitness/trainers" element={page(FitnessTrainersPage)} />
        <Route path="fitness/schedule" element={page(FitnessSchedulePage)} />
        <Route path="fitness/reports" element={page(FitnessReportsPage)} />
        <Route path="fitness/settings" element={page(FitnessSettingsPage)} />
        <Route path="fitness/abonements" element={page(FitnessAbonementsPage)} />
        <Route path="fitness/guide" element={page(FitnessGuidePage)} />
        <Route path="orders" element={page(OrdersPage)} />
        <Route path="knowledge" element={page(KnowledgePage)} />
        <Route path="managers" element={page(ManagersPage)} />
        <Route path="ai-usage" element={page(AIUsagePage)} />
        <Route path="marketing" element={page(MarketingGeneratorPage)} />
        <Route path="billing" element={page(BillingPage)} />
        <Route path="settings" element={page(BusinessSettingsPage)} />
      </Route>

      <Route element={<PublicLayout />}>
        <Route path="/c/:citySlug" element={page(PublicCityPage)} />
        <Route path="/c/:citySlug/:categorySlug" element={page(PublicCategoryPage)} />
        <Route path="/b/:businessSlug" element={page(PublicBusinessPage)} />
      </Route>

      <Route path="/" element={page(LandingPage)} />
      <Route path="*" element={page(NotFoundPage)} />
    </Routes>
  );
}
