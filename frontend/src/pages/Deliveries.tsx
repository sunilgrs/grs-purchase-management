import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  ErrorBox,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
} from '../components/ui'
import { ItemLineEditor, type LineDraft } from '../components/ItemLineEditor'
import { useFetch, useApiAction } from '../hooks/useFetch'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { formatDate, formatDateTime } from '../lib/format'
import { badgeColor } from '../lib/status'
import { newLine } from '../lib/lines'
import { PrintButton, PrintSheet } from '../components/print'
import type { Delivery, Item, PurchaseOrder, User } from '../types'

export default function DeliveriesPage() {
  const { user } = useAuth()
  const role = user?.role
  const canDeliver =
    role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const navigate = useNavigate()
  const { data, loading, error, reload } = useFetch<Delivery[]>('/deliveries')
  const { data: pos } = useFetch<PurchaseOrder[]>('/purchase-orders')
  const { data: users } = useFetch<User[]>('/users')
  const { data: items } = useFetch<Item[]>('/items')
  const action = useApiAction()
  const [viewing, setViewing] = useState<Delivery | null>(null)

  const [recordOpen, setRecordOpen] = useState(false)
  const [selectedPoId, setSelectedPoId] = useState('')
  const [deliverForm, setDeliverForm] = useState({
    receivedById: '',
    deliveryDate: new Date().toISOString().slice(0, 10),
    status: 'PARTIAL',
    remarks: '',
  })
  const [deliverLines, setDeliverLines] = useState<LineDraft[]>([])

  const selectedPo = pos?.find((p) => p.id === Number(selectedPoId))

  const openRecord = () => {
    setSelectedPoId('')
    setDeliverForm({
      receivedById: '',
      deliveryDate: new Date().toISOString().slice(0, 10),
      status: 'PARTIAL',
      remarks: '',
    })
    setDeliverLines([])
    setRecordOpen(true)
  }

  const selectPo = (poId: string) => {
    setSelectedPoId(poId)
    const po = pos?.find((p) => p.id === Number(poId))
    setDeliverLines(
      (po?.items ?? []).map((it) =>
        newLine({
          itemId: String(it.itemId),
          quantity: String(Math.max(0, it.orderedQty - it.receivedQty)),
        }),
      ),
    )
  }

  const submitRecord = async (e: FormEvent) => {
    e.preventDefault()
    if (!selectedPo) return
    const payload = {
      poId: selectedPo.id,
      receivedById: Number(deliverForm.receivedById),
      deliveryDate: deliverForm.deliveryDate,
      status: deliverForm.status,
      remarks: deliverForm.remarks || undefined,
      items: deliverLines.map((l) => ({
        itemId: Number(l.itemId),
        receivedQty: Number(l.quantity),
        condition: (l.condition || 'GOOD') as string,
      })),
    }
    const res = await action.run(() => api.post('/deliveries', payload))
    if (res) {
      setRecordOpen(false)
      reload()
    }
  }

  return (
    <div>
      <PageHeader
        title="Deliveries"
        subtitle="Goods received against purchase orders. Record deliveries and report issues here."
        actions={
          canDeliver ? (
            <Button onClick={openRecord}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Record Delivery
            </Button>
          ) : null
        }
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">
            No deliveries yet. Click “Record Delivery” to receive goods against a purchase order.
          </div>
        ) : (
          <Table headers={['PO', 'Delivery Date', 'Received By', 'Status', { label: 'Items', align: 'right' }, { label: 'Issues', align: 'right' }, '']}>
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
                <td className="px-4 py-3 text-right">{d._count?.items ?? d.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  {(d._count?.Discrepancy ?? 0) > 0 ? (
                    <Badge color="red">{d._count!.Discrepancy}</Badge>
                  ) : (
                    <span className="text-sm text-slate-400">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {canDeliver && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => navigate(`/discrepancies?poId=${d.poId}&deliveryId=${d.id}`)}
                      >
                        Report Issue
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => setViewing(d)}>View</Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={Boolean(viewing)} onClose={() => setViewing(null)} title={`Delivery — ${viewing?.PurchaseOrder?.poNumber ?? ''}`} wide footer={<PrintButton />}>
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

            <Table headers={['Item', 'Unit', { label: 'Received', align: 'right' }, 'Condition']}>
              {(viewing.items ?? []).map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2.5">
                    <span className="font-medium text-emerald-950">{it.Item?.itemName ?? 'Item'}</span>
                    <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
                  </td>
                  <td className="px-4 py-2.5">{it.Item?.unit ?? '—'}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{it.receivedQty}</td>
                  <td className="px-4 py-2.5">
                    <Badge color={badgeColor(it.condition)}>{it.condition.replace('_', ' ')}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        )}
      </Modal>

      {viewing && <DeliveryPrintSheet delivery={viewing} />}

      <Modal open={recordOpen} onClose={() => setRecordOpen(false)} title="Record Delivery" wide>
        <form onSubmit={submitRecord} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Purchase Order"
              required
              value={selectedPoId}
              onChange={(e) => selectPo(e.target.value)}
            >
              <option value="">— Select —</option>
              {(pos ?? [])
                .filter((p) => p.status !== 'COMPLETED')
                .map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.poNumber} — {p.Vendor?.vendorName ?? ''}
                  </option>
                ))}
            </Select>
            <Select
              label="Received By"
              required
              value={deliverForm.receivedById}
              onChange={(e) => setDeliverForm({ ...deliverForm, receivedById: e.target.value })}
            >
              <option value="">— Select —</option>
              {users
                ?.filter((u) => u.status === 'ACTIVE')
                .map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
            </Select>
            <Input
              label="Delivery Date"
              type="date"
              required
              value={deliverForm.deliveryDate}
              onChange={(e) => setDeliverForm({ ...deliverForm, deliveryDate: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Status"
              required
              value={deliverForm.status}
              onChange={(e) => setDeliverForm({ ...deliverForm, status: e.target.value })}
            >
              <option value="PARTIAL">PARTIAL</option>
              <option value="FULL">FULL</option>
            </Select>
          </div>

          {selectedPo && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Items pre-filled from {selectedPo.poNumber}. Adjust received quantities as needed.
            </p>
          )}

          <ItemLineEditor items={items ?? []} lines={deliverLines} onChange={setDeliverLines} includeCondition />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Remarks</span>
            <textarea
              rows={2}
              value={deliverForm.remarks}
              onChange={(e) => setDeliverForm({ ...deliverForm, remarks: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {action.error && <div className="text-sm text-red-600">{action.error}</div>}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setRecordOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? 'Saving…' : 'Save Delivery'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function DeliveryPrintSheet({ delivery }: { delivery: Delivery }) {
  return (
    <PrintSheet
      title="Delivery Challan"
      number={delivery.PurchaseOrder?.poNumber}
      meta={[
        { label: 'Delivery Date', value: formatDate(delivery.deliveryDate) },
        { label: 'Received By', value: delivery.User?.name ?? '—' },
        { label: 'Status', value: delivery.status.replace('_', ' ') },
        { label: 'Recorded', value: formatDateTime(delivery.createdAt) },
      ]}
      columns={['Item', 'Unit', 'Received', 'Condition']}
      rows={(delivery.items ?? []).map((it) => [
        <span key="n">
          {it.Item?.itemName ?? 'Item'}
          <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
        </span>,
        it.Item?.unit ?? '—',
        it.receivedQty,
        it.condition.replace('_', ' '),
      ])}
    />
  )
}
