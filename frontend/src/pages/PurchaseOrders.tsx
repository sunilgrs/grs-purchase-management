import { useEffect, useState, type FormEvent } from 'react'
import { useFocusParam } from '../hooks/useFocus'
import { ItemLineEditor } from '../components/ItemLineEditor'
import type { LineDraft } from '../components/ItemLineEditor'
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
import { useApiAction, useFetch } from '../hooks/useFetch'
import { useAuth } from '../auth/useAuth'
import { api } from '../lib/api'
import { formatDate, formatNumber } from '../lib/format'
import { newLine } from '../lib/lines'
import { badgeColor } from '../lib/status'
import { PrintButton, PrintSheet } from '../components/print'
import type { Item, PurchaseOrder, Requirement, User, Vendor } from '../types'

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const role = user?.role
  const canManagePo = role === 'MANAGER' || role === 'ADMIN'
  const canDeliver = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const { data, loading, error, reload } = useFetch<PurchaseOrder[]>('/purchase-orders')
  const { data: requirements } = useFetch<Requirement[]>('/requirements')
  const { data: vendors } = useFetch<Vendor[]>('/vendors')
  const { data: users } = useFetch<User[]>('/users')
  const { data: items } = useFetch<Item[]>('/items')
  const action = useApiAction()

  const [showCreate, setShowCreate] = useState(false)
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null)
  const [delivering, setDelivering] = useState<PurchaseOrder | null>(null)
  const [form, setForm] = useState({
    requirementId: '',
    vendorId: '',
    expectedDate: '',
    notes: '',
  })
  const [lines, setLines] = useState<LineDraft[]>([])
  const [selectedReq, setSelectedReq] = useState<Requirement | null>(null)
  const [reqFetching, setReqFetching] = useState(false)
  const [deliverForm, setDeliverForm] = useState({
    receivedById: '',
    deliveryDate: new Date().toISOString().slice(0, 10),
    status: 'PARTIAL',
    remarks: '',
  })
  const [deliverLines, setDeliverLines] = useState<LineDraft[]>([])
  const { focusId, clearFocus } = useFocusParam()

  useEffect(() => {
    if (focusId == null || !data || data.length === 0) return
    const match = data.find((po) => po.id === focusId)
    if (!match) return
    setViewing(match)
    clearFocus()
  }, [focusId, data, clearFocus])

  useEffect(() => {
    if (!form.requirementId) {
      setSelectedReq(null)
      setLines([])
      return
    }
    let cancelled = false
    setReqFetching(true)
    api
      .get<Requirement>(`/requirements/${form.requirementId}`)
      .then((r) => {
        if (cancelled) return
        setSelectedReq(r)
        setLines(
          (r.items ?? []).map((it) =>
            newLine({ itemId: String(it.itemId), quantity: String(it.quantity) }),
          ),
        )
      })
      .finally(() => {
        if (!cancelled) setReqFetching(false)
      })
    return () => {
      cancelled = true
    }
  }, [form.requirementId])

  const openCreate = () => {
    setForm({ requirementId: '', vendorId: '', expectedDate: '', notes: '' })
    setLines([])
    setSelectedReq(null)
    setShowCreate(true)
  }

  const openDeliver = (po: PurchaseOrder) => {
    setDelivering(po)
    setDeliverForm({
      receivedById: '',
      deliveryDate: new Date().toISOString().slice(0, 10),
      status: 'PARTIAL',
      remarks: '',
    })
    setDeliverLines(
      (po.items ?? []).map((it) =>
        newLine({
          itemId: String(it.itemId),
          quantity: String(Math.max(0, it.orderedQty - it.receivedQty)),
        }),
      ),
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      requirementId: Number(form.requirementId),
      vendorId: Number(form.vendorId),
      expectedDate: form.expectedDate,
      notes: form.notes || undefined,
      items: lines.map((l) => ({
        itemId: Number(l.itemId),
        orderedQty: Number(l.quantity),
        unitPrice: l.unitPrice === '' || l.unitPrice === undefined ? undefined : Number(l.unitPrice),
      })),
    }
    const res = await action.run(() => api.post<PurchaseOrder>('/purchase-orders', payload))
    if (res) {
      setShowCreate(false)
      reload()
      setViewing(res)
    }
  }

  const submitDeliver = async (e: FormEvent) => {
    e.preventDefault()
    if (!delivering) return
    const payload = {
      poId: delivering.id,
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
      setDelivering(null)
      reload()
    }
  }

  const poStatus = (po: PurchaseOrder) => {
    const total = po.items?.reduce((s, i) => s + i.orderedQty, 0) ?? 0
    const received = po.items?.reduce((s, i) => s + i.receivedQty, 0) ?? 0
    if (po.status === 'COMPLETED') return 'COMPLETED'
    if (received > 0 && received < total) return 'PARTIALLY_RECEIVED'
    return po.status
  }

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        subtitle="Create POs against approved requirements, then record deliveries."
        actions={
          canManagePo ? (
            <Button onClick={openCreate}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New Purchase Order
            </Button>
          ) : null
        }
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No purchase orders yet.</div>
        ) : (
          <Table headers={['PO #', 'Vendor', 'Requirement', 'Expected', 'Status', { label: 'Items', align: 'right' }, '']}>
            {data.map((po) => (
              <tr key={po.id} className="hover:bg-emerald-50/70">
                <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-950">{po.poNumber}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{po.Vendor?.vendorName ?? '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{po.Requirement?.requirementNo ?? '—'}</td>
                <td className="px-4 py-3">{formatDate(po.expectedDate)}</td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(poStatus(po))}>{poStatus(po).replace('_', ' ')}</Badge>
                </td>
                <td className="px-4 py-3 text-right">{po._count?.items ?? po.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setViewing(po)}>View</Button>
                    {canDeliver && po.status !== 'COMPLETED' && (
                      <Button size="sm" variant="secondary" onClick={() => openDeliver(po)}>
                        Deliver
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Purchase Order" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Requirement"
              required
              value={form.requirementId}
              onChange={(e) => setForm({ ...form, requirementId: e.target.value })}
            >
              <option value="">— Select —</option>
              {requirements?.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.requirementNo} — {r.Store?.storeName ?? ''} ({r.status})
                </option>
              ))}
            </Select>
            <Select label="Vendor" required value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}>
              <option value="">— Select —</option>
              {vendors?.filter((v) => v.active).map((v) => (
                <option key={v.id} value={String(v.id)}>{v.vendorName}</option>
              ))}
            </Select>
            <Input label="Expected Date" type="date" required value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
          </div>

          {reqFetching && (
            <p className="flex items-center gap-2 text-xs text-slate-400">
              <Spinner className="h-3.5 w-3.5" /> Loading requirement items…
            </p>
          )}
          {selectedReq && !reqFetching && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Items pre-filled from {selectedReq.requirementNo} ({selectedReq.priority} priority). Adjust quantities if needed.
            </p>
          )}

          <ItemLineEditor items={items ?? []} lines={lines} onChange={setLines} includePrice />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {action.error && <div className="text-sm text-red-600">{action.error}</div>}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? 'Creating…' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      <PODetail po={viewing} onClose={() => setViewing(null)} />

      {viewing && <POPrintSheet po={viewing} />}

      <Modal open={Boolean(delivering)} onClose={() => setDelivering(null)} title={`Record Delivery — ${delivering?.poNumber ?? ''}`} wide>
        <form onSubmit={submitDeliver} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Received By" required value={deliverForm.receivedById} onChange={(e) => setDeliverForm({ ...deliverForm, receivedById: e.target.value })}>
              <option value="">— Select —</option>
              {users
                ?.filter((u) => u.status === 'ACTIVE')
                .map((u) => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
            </Select>
            <Input label="Delivery Date" type="date" required value={deliverForm.deliveryDate} onChange={(e) => setDeliverForm({ ...deliverForm, deliveryDate: e.target.value })} />
            <Select label="Status" required value={deliverForm.status} onChange={(e) => setDeliverForm({ ...deliverForm, status: e.target.value })}>
              <option value="PARTIAL">PARTIAL</option>
              <option value="FULL">FULL</option>
            </Select>
          </div>

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
            <Button type="button" variant="secondary" onClick={() => setDelivering(null)}>Cancel</Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? 'Saving…' : 'Save Delivery'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

function PODetail({ po, onClose }: { po: PurchaseOrder | null; onClose: () => void }) {
  const total = po?.items?.reduce((s, i) => s + i.orderedQty * (i.unitPrice ?? 0), 0) ?? 0
  return (
    <Modal open={Boolean(po)} onClose={onClose} title={`Purchase Order ${po?.poNumber ?? ''}`} wide footer={<PrintButton />}>
      {po && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Vendor</p>
              <p className="font-medium text-slate-800">{po.Vendor?.vendorName ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Requirement</p>
              <p className="font-medium text-slate-800">{po.Requirement?.requirementNo ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Expected</p>
              <p className="font-medium text-slate-800">{formatDate(po.expectedDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <Badge color={badgeColor(po.status)}>{po.status.replace('_', ' ')}</Badge>
            </div>
          </div>

          {po.notes && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{po.notes}</p>
          )}

          <Table headers={['Item', 'Unit', { label: 'Ordered', align: 'right' }, { label: 'Received', align: 'right' }, { label: 'Unit Price', align: 'right' }, { label: 'Amount', align: 'right' }]}>
            {(po.items ?? []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-emerald-950">{it.Item?.itemName ?? 'Item'}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
                </td>
                <td className="px-4 py-2.5">{it.Item?.unit ?? '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium">{it.orderedQty}</td>
                <td className="px-4 py-2.5 text-right">{it.receivedQty}</td>
                <td className="px-4 py-2.5 text-right">{it.unitPrice != null ? `₹${formatNumber(it.unitPrice, 0)}` : '—'}</td>
                <td className="px-4 py-2.5 text-right font-medium">₹{formatNumber(it.orderedQty * (it.unitPrice ?? 0), 0)}</td>
              </tr>
            ))}
            <tr className="bg-slate-50">
              <td className="px-4 py-2.5 text-right font-semibold text-emerald-950" colSpan={5}>
                Total
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-emerald-950">₹{formatNumber(total, 0)}</td>
            </tr>
          </Table>
        </div>
      )}
    </Modal>
  )
}

function POPrintSheet({ po }: { po: PurchaseOrder }) {
  const total = po.items?.reduce((s, i) => s + i.orderedQty * (i.unitPrice ?? 0), 0) ?? 0
  return (
    <PrintSheet
      title="Purchase Order"
      number={po.poNumber}
      subtitle="Please supply the items listed below against the above order."
      meta={[
        { label: 'Vendor', value: po.Vendor?.vendorName ?? '—' },
        { label: 'Requirement', value: po.Requirement?.requirementNo ?? '—' },
        { label: 'Order Date', value: formatDate(po.orderDate) },
        { label: 'Expected Date', value: formatDate(po.expectedDate) },
        { label: 'Status', value: po.status.replace('_', ' ') },
      ]}
      columns={['Item', 'Unit', 'Ordered', 'Received', 'Unit Price', 'Amount']}
      rows={(po.items ?? []).map((it) => [
        <span key="n">
          {it.Item?.itemName ?? 'Item'}
          <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
        </span>,
        it.Item?.unit ?? '—',
        it.orderedQty,
        it.receivedQty,
        it.unitPrice != null ? `₹${formatNumber(it.unitPrice, 0)}` : '—',
        `₹${formatNumber(it.orderedQty * (it.unitPrice ?? 0), 0)}`,
      ])}
      footer={
        <div className="flex justify-end border-t border-slate-300 pt-2 font-semibold">
          <span className="w-40 text-right">Total</span>
          <span className="w-32 text-right">₹{formatNumber(total, 0)}</span>
        </div>
      }
    />
  )
}
