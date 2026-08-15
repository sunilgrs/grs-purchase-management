import { useMemo, useState } from 'react'
import {
  Button,
  Card,
  EmptyState,
  ErrorBox,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { downloadCSV } from '../lib/csv'

export interface SpendRow {
  label: string
  count: number
  spend: number
}

export interface SpendReport {
  groupBy: string
  from: string
  to: string
  count: number
  total: number
  rows: SpendRow[]
}

const GROUP_OPTIONS = [
  { value: 'month', label: 'Month' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'store', label: 'Store' },
  { value: 'item', label: 'Item' },
]

function isoDate(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function groupLabel(value: string): string {
  return GROUP_OPTIONS.find((o) => o.value === value)?.label ?? value
}

export default function ReportsPage() {
  const [groupBy, setGroupBy] = useState('month')
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 1)
    return isoDate(d)
  })
  const [to, setTo] = useState(() => isoDate(new Date()))
  const [applied, setApplied] = useState({ groupBy: 'month', from, to })

  const query = useMemo(
    () =>
      `/reports/spend?groupBy=${applied.groupBy}&from=${applied.from}&to=${applied.to}`,
    [applied],
  )
  const { data, loading, error, reload } = useFetch<SpendReport>(query)

  const apply = () => setApplied({ groupBy, from, to })

  const handleExport = () => {
    if (!data) return
    const rows: string[][] = [
      ['Label', 'Orders', 'Spend'],
      ...data.rows.map((r) => [r.label, String(r.count), String(r.spend)]),
      ['Total', String(data.count), String(data.total)],
    ]
    downloadCSV(
      `spend-report-${data.groupBy}-${data.from}-to-${data.to}.csv`,
      rows,
    )
  }

  const money = (v: number) => `₹${v.toLocaleString('en-IN')}`

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Spend across purchase orders by month, vendor, store or item."
        actions={
          <Button variant="secondary" onClick={handleExport} disabled={!data}>
            Export CSV
          </Button>
        }
      />

      <Card className="mb-4 p-4">
        <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
          <Select label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
            {GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">From</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">To</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <Button onClick={apply} disabled={loading || !from || !to}>
            Run report
          </Button>
        </div>
      </Card>

      {error && <ErrorBox message={error} onRetry={reload} />}

      {loading && !data ? (
        <div className="flex items-center justify-center rounded-2xl border border-emerald-100 bg-white py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : !data || data.rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No spend in this range"
            hint="Try widening the date range or checking a different group."
          />
        </Card>
      ) : (
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-4">
            <h2 className="text-base font-semibold text-emerald-950">
              Spend by {groupLabel(data.groupBy)}
            </h2>
            <span className="text-sm text-slate-500">
              {data.from} → {data.to} · {data.count} orders
            </span>
          </div>
          <Table headers={['Label', { label: 'Orders', align: 'right' }, { label: 'Spend', align: 'right' }]}>
            {data.rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-3 text-sm font-medium text-emerald-950">{r.label}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-600">{r.count}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-600">{money(r.spend)}</td>
              </tr>
            ))}
            <tr className="bg-emerald-50/60">
              <td className="px-4 py-3 text-sm font-semibold text-emerald-950">Total</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-950">{data.count}</td>
              <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-950">{money(data.total)}</td>
            </tr>
          </Table>
        </Card>
      )}
    </div>
  )
}
