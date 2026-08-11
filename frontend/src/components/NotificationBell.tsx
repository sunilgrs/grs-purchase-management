import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Spinner } from './ui'
import { useFetch } from '../hooks/useFetch'
import { formatDate } from '../lib/format'

export interface NotificationsPayload {
  approvals: {
    id: number
    requirementNo: string
    priority: string
    createdAt: string
    requestedBy: { name: string } | null
  }[]
  deliveries: {
    id: number
    poNumber: string
    expectedDate: string
    status: string
    createdAt: string
    Vendor: { vendorName: string } | null
  }[]
  discrepancies: {
    id: number
    discrepancyType: string
    status: string
    createdAt: string
    Item: { itemName: string } | null
    PurchaseOrder: { poNumber: string } | null
  }[]
}

interface BellItem {
  id: string
  title: string
  subtitle: string
  meta: string
  route: string
  createdAt: string
  tone: 'amber' | 'emerald' | 'rose'
}

interface BellGroup {
  key: string
  title: string
  route: string
  items: BellItem[]
}

const READ_KEY = 'grs_notif_read'

const toneDot: Record<BellItem['tone'], string> = {
  amber: 'bg-amber-500',
  emerald: 'bg-emerald-500',
  rose: 'bg-rose-500',
}

function buildGroups(payload: NotificationsPayload): BellGroup[] {
  return [
    {
      key: 'approvals',
      title: 'Pending Approvals',
      route: '/requirements',
      items: payload.approvals.map((a) => ({
        id: `approvals:${a.id}`,
        title: a.requirementNo,
        subtitle: `${a.priority} · requested by ${a.requestedBy?.name ?? '—'}`,
        meta: formatDate(a.createdAt),
        route: '/requirements',
        createdAt: a.createdAt,
        tone: 'amber' as const,
      })),
    },
    {
      key: 'deliveries',
      title: 'POs Awaiting Delivery',
      route: '/purchase-orders',
      items: payload.deliveries.map((d) => ({
        id: `deliveries:${d.id}`,
        title: d.poNumber,
        subtitle: `${d.Vendor?.vendorName ?? '—'} · ${d.status.replace('_', ' ')}`,
        meta: `expected ${formatDate(d.expectedDate)}`,
        route: '/purchase-orders',
        createdAt: d.createdAt,
        tone: 'emerald' as const,
      })),
    },
    {
      key: 'discrepancies',
      title: 'Open Discrepancies',
      route: '/discrepancies',
      items: payload.discrepancies.map((d) => ({
        id: `discrepancies:${d.id}`,
        title: `${d.discrepancyType.replace('_', ' ')} · ${d.Item?.itemName ?? 'Item'}`,
        subtitle: d.PurchaseOrder?.poNumber ?? '—',
        meta: formatDate(d.createdAt),
        route: '/discrepancies',
        createdAt: d.createdAt,
        tone: 'rose' as const,
      })),
    },
  ].filter((g) => g.items.length > 0)
}

function readTimestamp(): string {
  return localStorage.getItem(READ_KEY) ?? ''
}

function isUnread(item: BellItem, readAt: string): boolean {
  if (!item.createdAt || !readAt) return true
  const t = new Date(item.createdAt).getTime()
  const r = new Date(readAt).getTime()
  if (Number.isNaN(t)) return true
  if (Number.isNaN(r)) return true
  return t > r
}

export default function NotificationBell({
  placement = 'down',
}: {
  placement?: 'down' | 'up'
}) {
  const navigate = useNavigate()
  const { data, loading, reload } = useFetch<NotificationsPayload>('/notifications', 30000)
  const [open, setOpen] = useState(false)
  const [readAt, setReadAt] = useState<string>(() => readTimestamp())

  const groups = data ? buildGroups(data) : []
  const allItems = groups.flatMap((g) => g.items)
  const unreadCount = allItems.filter((it) => isUnread(it, readAt)).length

  const toggle = () => {
    const next = !open
    setOpen(next)
    if (next) reload()
  }

  const markAllRead = () => {
    const now = new Date().toISOString()
    localStorage.setItem(READ_KEY, now)
    setReadAt(now)
  }

  const openItem = (route: string) => {
    markAllRead()
    setOpen(false)
    navigate(route)
  }

  const panelPosition =
    placement === 'up'
      ? 'bottom-full right-0 mb-2'
      : 'top-full right-0 mt-2'

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notifications"
        aria-expanded={open}
        className="relative rounded-md p-1.5 text-emerald-900/70 hover:bg-emerald-50 hover:text-emerald-900"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path
            d="M14.8 17H5.2a2 2 0 01-1.4-3.4L5 12.4V10a7 7 0 0114 0v2.4l1.2 1.2A2 2 0 0118.8 17h-4zM10.5 20a2 2 0 003 0"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute z-50 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg ${panelPosition}`}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-950">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                >
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {loading && !data ? (
                <div className="flex items-center justify-center py-10">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : allItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M14.8 17H5.2a2 2 0 01-1.4-3.4L5 12.4V10a7 7 0 0114 0v2.4l1.2 1.2A2 2 0 0118.8 17h-4zM10.5 20a2 2 0 003 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p className="text-sm text-slate-400">You’re all caught up</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.key} className="border-b border-slate-100 last:border-0">
                    <div className="flex items-center justify-between px-4 pb-1 pt-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        {group.title}
                      </p>
                      <span className="text-xs text-slate-400">{group.items.length}</span>
                    </div>
                    <ul>
                      {group.items.map((item) => {
                        const unread = isUnread(item, readAt)
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => openItem(item.route)}
                              className="flex w-full items-start gap-2.5 px-4 py-2 text-left hover:bg-emerald-50/60"
                            >
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[item.tone]} ${unread ? '' : 'opacity-30'}`} />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-emerald-950">
                                  {item.title}
                                </span>
                                <span className="block truncate text-xs text-slate-500">{item.subtitle}</span>
                              </span>
                              <span className="shrink-0 text-[11px] text-slate-400">{item.meta}</span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
