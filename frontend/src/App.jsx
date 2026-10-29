import { Navigate, Outlet, Route, Routes } from "react-router-dom"
import { useAuth } from "./contexts/AuthContext"
import AppLayout from "./components/layout/AppLayout"
import DashboardPage from "./pages/DashboardPage"
import {
  CustomerDetailsPage,
  CustomerFormPage,
  CustomerListPage,
} from "./pages/CustomerPages"
import { LoginPage, NotFoundPage, PrivacyPolicyPage } from "./pages/MiscPages"
import ReportsPage from "./pages/ReportsPage"
import {
  CreateSalePage,
  SaleDetailsPage,
  SalesListPage,
} from "./pages/SalesPages"
import SettingsPage from "./pages/SettingsPage"
import UserManagementPage from "./pages/UserManagementPage"
import StockAdjustmentsPage from "./pages/StockAdjustmentsPage"
import {
  VehicleDetailsPage,
  VehicleFormPage,
  VehicleListPage,
} from "./pages/VehiclePages"

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="vehicles" element={<VehicleListPage />} />
          <Route path="vehicles/new" element={<VehicleFormPage />} />
          <Route path="vehicles/:id/edit" element={<VehicleFormPage />} />
          <Route path="vehicles/:id" element={<VehicleDetailsPage />} />
          <Route path="customers" element={<CustomerListPage />} />
          <Route path="customers/new" element={<CustomerFormPage />} />
          <Route path="customers/:id/edit" element={<CustomerFormPage />} />
          <Route path="customers/:id" element={<CustomerDetailsPage />} />
          <Route path="sales" element={<SalesListPage />} />
          <Route path="sales/new" element={<CreateSalePage />} />
          <Route path="sales/:id" element={<SaleDetailsPage />} />
          <Route path="stock-adjustments" element={<StockAdjustmentsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="users"
            element={
              <RequireManager>
                <UserManagementPage />
              </RequireManager>
            }
          />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function RequireAuth() {
  const { user, loading } = useAuth()
  if (loading)
    return (
      <div className="app-loading" role="status">
        Checking staff session…
      </div>
    )
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

function RequireManager({ children }) {
  const { user } = useAuth()

  return user?.role === "Manager" ? children : <Navigate to="/" replace />
}
