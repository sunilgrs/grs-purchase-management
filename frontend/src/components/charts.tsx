import type { ReactNode } from 'react'

export interface ChartDatum {
  label: string
  value: number
}

const PALETTE = [
  '#059669',
  '#0d9488',
  '#f59e0b',
  '#0ea5e9',
  '#6366f1',
  '#f43f5e',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#64748b',
]

const COLOR_OVERRIDES: Record<string, string> = {
  partial: '#0ea5e9',
  shortage: '#0ea5e9',
  low: '#0ea5e9',
}

function colorFor(label: string, index: number): string {
  return COLOR_OVERRIDES[label.toLowerCase()] ?? PALETTE[index % PALETTE.length]
}

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function Bars({ data, formatValue }: { data: ChartDatum[]; formatValue: (v: number) => string }) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const pad = 8
  const labelH = 24
  const valueH = 18
  const chartH = 160
  const totalW = 600
  const innerW = totalW - pad * 2
  const gap = data.length > 1 ? 10 : 0
  const barW = Math.min(48, (innerW - gap * (data.length - 1)) / data.length)

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + valueH + labelH}`} className="w-full">
      <line x1={pad} y1={chartH + valueH - 14} x2={totalW - pad} y2={chartH + valueH - 14} stroke="#e2e8f0" strokeWidth={1} />
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(4, (d.value / max) * (chartH - 20)) : 4
        const x = pad + i * (barW + gap) + (innerW - data.length * barW - gap * (data.length - 1)) / 2
        const y = chartH + valueH - 14 - h
        return (
          <g key={d.label}>
            <title>{`${d.label}: ${formatValue(d.value)}`}</title>
            <rect x={x} y={y} width={barW} height={h} rx={4} className="fill-emerald-600/90" />
            {d.value > 0 && (
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fill="#0f172a" fontWeight={600}>
                {formatCompact(d.value)}
              </text>
            )}
            <text x={x + barW / 2} y={chartH + valueH + 2} textAnchor="middle" fontSize={11} fill="#64748b">
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export function BarChart({
  data,
  title,
  formatValue = (v) => String(v),
  empty,
}: {
  data: ChartDatum[]
  title: string
  formatValue?: (v: number) => string
  empty?: string
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">{title}</p>
      {data.every((d) => d.value === 0) ? (
        <p className="flex h-40 items-center justify-center text-sm text-slate-400">{empty ?? 'No data yet'}</p>
      ) : (
        <Bars data={data} formatValue={formatValue} />
      )}
    </div>
  )
}

export function DonutChart({
  data,
  title,
  formatValue = (v) => String(v),
  empty,
}: {
  data: ChartDatum[]
  title: string
  formatValue?: (v: number) => string
  empty?: string
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const radius = 46
  const stroke = 16
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">{title}</p>
      {total === 0 ? (
        <p className="flex h-40 items-center justify-center text-sm text-slate-400">{empty ?? 'No data yet'}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0">
            <circle cx={60} cy={60} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
            {data.map((d, i) => {
              const fraction = d.value / total
              const dash = fraction * circumference
              const el = (
                <circle
                  key={d.label}
                  cx={60}
                  cy={60}
                  r={radius}
                  fill="none"
                  stroke={colorFor(d.label, i)}
                  strokeWidth={stroke}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset * circumference}
                  transform="rotate(-90 60 60)"
                >
                  <title>{`${d.label}: ${formatValue(d.value)}`}</title>
                </circle>
              )
              offset += fraction
              return el
            })}
            <text x={60} y={58} textAnchor="middle" fontSize={22} fontWeight={700} fill="#064e3b">
              {total}
            </text>
            <text x={60} y={74} textAnchor="middle" fontSize={10} fill="#64748b">
              total
            </text>
          </svg>
          <ul className="min-w-0 flex-1 space-y-1.5">
            {data.map((d, i) => (
              <li key={d.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: colorFor(d.label, i) }} />
                  <span className="truncate text-slate-600">{d.label.replace(/_/g, ' ')}</span>
                </span>
                <span className="font-medium text-emerald-950">{formatValue(d.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function RankList({
  data,
  title,
  formatValue = (v) => String(v),
  empty,
}: {
  data: ChartDatum[]
  title: string
  formatValue?: (v: number) => string
  empty?: string
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-slate-500">{title}</p>
      {data.length === 0 ? (
        <p className="flex h-40 items-center justify-center text-sm text-slate-400">{empty ?? 'No data yet'}</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-slate-600">{d.label}</span>
                <span className="shrink-0 font-medium text-emerald-950">{formatValue(d.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${(d.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ChartCard({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className ?? ''}`}>
      <h3 className="mb-4 text-sm font-semibold text-emerald-950">{title}</h3>
      {children}
    </div>
  )
}
