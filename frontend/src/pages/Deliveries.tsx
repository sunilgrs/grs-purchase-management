import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Modal,
  PageHeader,
  Spinner,
  Table,
} from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatDate, formatDateTime } from '../lib/format'
import { badgeColor } from '../lib/status'
import type { Delivery } from '../types'

export default function DeliveriesPage() {
  const { data, loading, error, reload } = useFetch<Delivery[]>('/deliveries')
  const [viewing, setViewing] = useState<Delivery | null>(null)

  return (
    <div>
      <PageHeader
        title="Deliveries"
        subtitle="Goods received against purchase orders. Create deliveries from a purchase order."
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            No deliveries yet. Open a purchase order and click “Deliver”.
          </div>
        ) : (
          <Table headers={['PO', 'Delivery Date', 'Received By', 'Status', 'Items', 'Issues', '']}>
            {data.map((d) => (
              <tr key={d.id} className="hover:bg-emerald-50/70">
                <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-950">
                  {d.PurchaseOrder?.poNumber ?? '—'}
                </td>
                <td className="px-4 py-3">{formatDate(d.deliveryDate)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.User?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(d.status)}>{d.status.replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3">{d._count?.items ?? d.items?.length ?? 0}</td>
                <td className="px-4 py-3">
                  {(d._count?.Discrepancy ?? 0) > 0 ? (
                    <Badge color="red">{d._count!.Discrepancy}</Badge>
                  ) : (
                    <span className="text-sm text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setViewing(d)}>View</Button>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={`Delivery — ${viewing?.PurchaseOrder?.poNumber ?? ''}`} wide>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Delivery Date</p>
                <p className="font-medium text-slate-800">{formatDate(viewing.deliveryDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Received By</p>
                <p className="font-medium text-slate-800">{viewing.User?.name ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <Badge color={badgeColor(viewing.status)}>{viewing.status.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Recorded</p>
                <p className="font-medium text-slate-800">{formatDateTime(viewing.createdAt)}</p>
              </div>
            </div>

            {viewing.remarks && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{viewing.remarks}</p>
            )}

            <Table headers={['Item', 'Unit', 'Received', 'Condition']}>
              {(viewing.items ?? []).map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-emerald-950">{it.Item?.itemName ?? 'Item'}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
                  </td>
                  <td className="px-4 py-2.5">{it.Item?.unit ?? '—'}</td>
                  <td className="px-4 py-2.5 font-medium">{it.receivedQty}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={badgeColor(it.condition)}>{it.condition.replace('_', ' ')}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Modal>
    </div>
  )
}
