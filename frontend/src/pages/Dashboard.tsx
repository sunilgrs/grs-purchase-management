import { Link } from 'react-router-dom'
import { Badge, Card, Spinner } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../lib/format'
import { badgeColor } from '../lib/status'
import { useAuth } from '../auth/useAuth'

interface RecentPo {
  id: number
  poNumber: string
  expectedDate: string
  status: string
  Vendor: { vendorName: string } | null
  Requirement: { requirementNo: string } | null
}

export interface DashboardSummary {
  vendors: number
  items: number
  users: number
  requirements: number
  openRequirements: number
  purchaseOrders: number
  inProgressPos: number
  deliveries: number
  discrepancies: number
  openDiscrepancies: number
  recentPos: RecentPo[]
}

function StatCard({
  label,
  value,
  to,
  accent,
}: {
  label: string
  value: number
  to: string
  accent: string
}) {
  return (
    <Link to={to} className="block">
      <Card className="px-5 py-4 transition-shadow hover:shadow-md">
        <div className={`mb-2 h-1.5 w-8 rounded-full ${accent}`} />
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useFetch<DashboardSummary>('/dashboard/summary')

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          Welcome back, {user?.name}. Here’s an overview of procurement activity.
        </p>
      </div>

      {summary.loading || !summary.data ? (
        <div className="flex items-center justify-center py-24"><Spinner className="h-8 w-8" /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Vendors" value={summary.data.vendors} to="/vendors" accent="bg-violet-500" />
            <StatCard label="Items" value={summary.data.items} to="/items" accent="bg-emerald-500" />
            <StatCard label="Users" value={summary.data.users} to="/users" accent="bg-amber-500" />
            <StatCard label="Requirements" value={summary.data.requirements} to="/requirements" accent="bg-cyan-500" />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <StatCard label="Purchase Orders" value={summary.data.purchaseOrders} to="/purchase-orders" accent="bg-indigo-500" />
            <StatCard label="Deliveries" value={summary.data.deliveries} to="/deliveries" accent="bg-teal-500" />
            <StatCard label="Discrepancies" value={summary.data.discrepancies} to="/discrepancies" accent="bg-rose-500" />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <AlertCard
              title="Open Requirements"
              count={summary.data.openRequirements}
              hint="Awaiting approval to become purchase orders"
              to="/requirements"
              color={summary.data.openRequirements > 0 ? 'text-amber-600' : 'text-slate-400'}
            />
            <AlertCard
              title="POs In Progress"
              count={summary.data.inProgressPos}
              hint="Partially or not yet delivered"
              to="/purchase-orders"
              color={summary.data.inProgressPos > 0 ? 'text-blue-600' : 'text-slate-400'}
            />
            <AlertCard
              title="Open Discrepancies"
              count={summary.data.openDiscrepancies}
              hint="Damaged / short / mismatched items to resolve"
              to="/discrepancies"
              color={summary.data.openDiscrepancies > 0 ? 'text-red-600' : 'text-slate-400'}
            />
          </div>

          <Card>
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">Recent Purchase Orders</h2>
            </div>
            {summary.data.recentPos.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No purchase orders yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.data.recentPos.map((po) => (
                  <div key={po.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-slate-900">{po.poNumber}</p>
                      <p className="truncate text-sm text-slate-500">
                        {po.Vendor?.vendorName ?? '—'} · {po.Requirement?.requirementNo ?? ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(po.expectedDate)}</span>
                      <Badge color={badgeColor(po.status)}>{po.status.replace('_', ' ')}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}

function AlertCard({
  title,
  count,
  hint,
  to,
  color,
}: {
  title: string
  count: number
  hint: string
  to: string
  color: string
}) {
  return (
    <Link to={to}>
      <Card className="flex items-center justify-between px-5 py-4 transition-shadow hover:shadow-md">
        <div>
          <p className={`text-2xl font-semibold ${color}`}>{count}</p>
          <p className="text-sm font-medium text-slate-800">{title}</p>
          <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
        </div>
        <svg className="h-5 w-5 text-slate-300" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" />
        </svg>
      </Card>
    </Link>
  )
}
