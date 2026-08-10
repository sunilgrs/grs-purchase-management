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
import SettingsPage from './pages/Settings'

const featureRoutes = [
  { path: '/', feature: 'dashboard' },
  { path: '/vendors', feature: 'vendors' },
  { path: '/items', feature: 'items' },
  { path: '/users', feature: 'users' },
  { path: '/requirements', feature: 'requirements' },
  { path: '/purchase-orders', feature: 'purchase-orders' },
  { path: '/deliveries', feature: 'deliveries' },
  { path: '/discrepancies', feature: 'discrepancies' },
  { path: '/audit-logs', feature: 'audit-logs' },
  { path: '/settings', feature: 'settings' },
]

function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { token } = useAuth()
  if (token) return <Navigate to="/" replace />
  return <>{children}</>
}

function FirstAllowedPath() {
  const { hasFeature, isAdmin } = useAuth()
  const target =
    featureRoutes.find((r) => hasFeature(r.feature))?.path ??
    (isAdmin ? '/settings' : '/')
  return <Navigate to={target} replace />
}

function FeatureGate({
  feature,
  children,
}: {
  feature: string
  children: React.ReactNode
}) {
  const { hasFeature } = useAuth()
  if (!hasFeature(feature)) return <FirstAllowedPath />
  return <>{children}</>
}

function SettingsGate({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <FirstAllowedPath />
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
            <Route
              path="/"
              element={
                <FeatureGate feature="dashboard">
                  <Dashboard />
                </FeatureGate>
              }
            />
            <Route
              path="/vendors"
              element={
                <FeatureGate feature="vendors">
                  <VendorsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/items"
              element={
                <FeatureGate feature="items">
                  <ItemsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/users"
              element={
                <FeatureGate feature="users">
                  <UsersPage />
                </FeatureGate>
              }
            />
            <Route
              path="/requirements"
              element={
                <FeatureGate feature="requirements">
                  <RequirementsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/purchase-orders"
              element={
                <FeatureGate feature="purchase-orders">
                  <PurchaseOrdersPage />
                </FeatureGate>
              }
            />
            <Route
              path="/deliveries"
              element={
                <FeatureGate feature="deliveries">
                  <DeliveriesPage />
                </FeatureGate>
              }
            />
            <Route
              path="/discrepancies"
              element={
                <FeatureGate feature="discrepancies">
                  <DiscrepanciesPage />
                </FeatureGate>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <FeatureGate feature="audit-logs">
                  <AuditLogsPage />
                </FeatureGate>
              }
            />
            <Route
              path="/settings"
              element={
                <SettingsGate>
                  <SettingsPage />
                </SettingsGate>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
