import { Link } from 'react-router-dom'
import { Badge, Card, Spinner } from '../components/ui'
import { BarChart, ChartCard, DonutChart, RankList } from '../components/charts'
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

export interface DashboardAnalytics {
  spendTrend: { month: string; spend: number }[]
  poStatus: { status: string; count: number }[]
  discrepancyTypes: { type: string; count: number }[]
  priorityCounts: { priority: string; count: number }[]
  topVendors: { vendorName: string; spend: number }[]
  topItems: { itemName: string; spend: number }[]
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
        <p className="text-2xl font-semibold text-emerald-950">{value}</p>
        <p className="mt-0.5 text-sm text-slate-500">{label}</p>
      </Card>
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const summary = useFetch<DashboardSummary>('/dashboard/summary')
  const analytics = useFetch<DashboardAnalytics>('/dashboard/analytics')

  const money = (v: number) => `₹${v.toLocaleString('en-IN')}`

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-emerald-950">Dashboard</h1>
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
              color={summary.data.inProgressPos > 0 ? 'text-emerald-600' : 'text-slate-400'}
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
              <h2 className="text-base font-semibold text-emerald-950">Recent Purchase Orders</h2>
            </div>
            {summary.data.recentPos.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate-400">No purchase orders yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {summary.data.recentPos.map((po) => (
                  <div key={po.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs font-medium text-emerald-950">{po.poNumber}</p>
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

          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-emerald-950">Analytics</h2>
              <p className="mt-0.5 text-sm text-slate-500">Procurement trends across purchase orders, deliveries and discrepancies.</p>
            </div>
            {analytics.loading || !analytics.data ? (
              <div className="flex items-center justify-center rounded-2xl border border-slate-200 bg-white py-16">
                <Spinner className="h-8 w-8" />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <ChartCard title="Monthly Spend" className="lg:col-span-2">
                  <BarChart
                    data={analytics.data.spendTrend.map((m) => ({ label: m.month, value: m.spend }))}
                    title="Last 6 months"
                    formatValue={money}
                    empty="No purchase spend yet"
                  />
                </ChartCard>
                <ChartCard title="Purchase Order Status">
                  <DonutChart
                    data={analytics.data.poStatus.map((s) => ({ label: s.status, value: s.count }))}
                    title="Open vs completed"
                    empty="No status data yet"
                  />
                </ChartCard>
                <ChartCard title="Top Vendors by Spend">
                  <RankList
                    data={analytics.data.topVendors.map((v) => ({ label: v.vendorName, value: v.spend }))}
                    title="Vendors with recorded spend"
                    formatValue={money}
                    empty="No spend recorded yet"
                  />
                </ChartCard>
                <ChartCard title="Top Items by Spend">
                  <RankList
                    data={analytics.data.topItems.map((v) => ({ label: v.itemName, value: v.spend }))}
                    title="Items with recorded spend"
                    formatValue={money}
                    empty="No spend recorded yet"
                  />
                </ChartCard>
                <ChartCard title="Discrepancies by Type">
                  <DonutChart
                    data={analytics.data.discrepancyTypes.map((d) => ({ label: d.type, value: d.count }))}
                    title="How discrepancies break down"
                    empty="No discrepancies yet"
                  />
                </ChartCard>
                <ChartCard title="Requirements by Priority" className="lg:col-span-2">
                  <DonutChart
                    data={analytics.data.priorityCounts.map((p) => ({ label: p.priority, value: p.count }))}
                    title="Requested priority mix"
                    empty="No requirements yet"
                  />
                </ChartCard>
              </div>
            )}
          </div>
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
