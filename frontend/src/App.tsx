import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { ProtectedRoute } from './auth/ProtectedRoute'
import Layout from './components/Layout'
import AuditLogsPage from './pages/AuditLogs'
import Dashboard from './pages/Dashboard'
import DeliveriesPage from './pages/Deliveries'
import DiscrepanciesPage from './pages/Discrepancies'
import LoginPage from './pages/Login'
import {
  ItemsPage,
  UsersPage,
  VendorsPage,
} from './pages/master'
import PurchaseOrdersPage from './pages/PurchaseOrders'
import RegisterPage from './pages/Register'
import RequirementsPage from './pages/Requirements'

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <LoginPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/register"
            element={
              <RedirectIfAuthed>
                <RegisterPage />
              </RedirectIfAuthed>
            }
          />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendors" element={<VendorsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/requirements" element={<RequirementsPage />} />
            <Route path="/purchase-orders" element={<PurchaseOrdersPage />} />
            <Route path="/deliveries" element={<DeliveriesPage />} />
            <Route path="/discrepancies" element={<DiscrepanciesPage />} />
            <Route path="/audit-logs" element={<AuditLogsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
