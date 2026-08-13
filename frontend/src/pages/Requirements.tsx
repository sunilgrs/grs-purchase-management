import { useEffect, useState, type FormEvent } from 'react'
import { useFocusParam } from '../hooks/useFocus'
import { ItemLineEditor } from '../components/ItemLineEditor'
import type { LineDraft } from '../components/ItemLineEditor'
import { newLine } from '../lib/lines'
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
import { formatDate } from '../lib/format'
import { badgeColor } from '../lib/status'
import { PrintButton, PrintSheet } from '../components/print'
import type { Item, Requirement, Store, User, Vendor } from '../types'

const priorities = ['NORMAL', 'HIGH', 'URGENT']
const DEFAULT_STORE_NAME = 'IPS Main Store'

const defaultStoreId = (list: Store[] | null | undefined): string => {
  const store = list?.find((s) => s.storeName === DEFAULT_STORE_NAME) ?? list?.[0]
  return store ? String(store.id) : ''
}

const toDateInput = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface ApproveLine {
  itemId: number
  orderedQty: number
  unitPrice: string
}

interface WhatsAppFormatVariant {
  id: string
  label: string
  message: string
  waLink: string | null
}

interface WhatsAppPayload {
  message: string
  waLink: string | null
  mobile: string | null
  vendor: string
  poNumber: string
  expectedDate: string
  formats?: WhatsAppFormatVariant[]
}

const label = (status: string) => status.replace(/_/g, ' ')

export default function RequirementsPage() {
  const { user } = useAuth()
  const role = user?.role
  const canCreate = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canSubmit = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canManager = role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canWhatsApp = role === 'MANAGER' || role === 'ADMIN'
  const canVerify = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canEdit = (r: Requirement) =>
    canCreate &&
    (r.status === 'DRAFT' || r.status === 'REJECTED') &&
    (role !== 'STORE_KEEPER' || r.requestedById === user?.id)
  const { data, loading, error, reload } = useFetch<Requirement[]>('/requirements')
  const { data: stores } = useFetch<Store[]>('/stores')
  const { data: users } = useFetch<User[]>('/users')
  const { data: items } = useFetch<Item[]>('/items')
  const { data: vendors } = useFetch<Vendor[]>('/vendors')
  const action = useApiAction()

  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Requirement | null>(null)
  const [viewing, setViewing] = useState<Requirement | null>(null)
  const [reviewReq, setReviewReq] = useState<Requirement | null>(null)
  const [approveReq, setApproveReq] = useState<Requirement | null>(null)
  const [rejectReq, setRejectReq] = useState<Requirement | null>(null)
  const [waReq, setWaReq] = useState<Requirement | null>(null)
  const [verifyReq, setVerifyReq] = useState<Requirement | null>(null)
  const [form, setForm] = useState({
    storeId: '',
    requestedById: '',
    requiredDate: '',
    priority: 'NORMAL',
    remarks: '',
  })
  const [lines, setLines] = useState<LineDraft[]>([])
  const { focusId, clearFocus } = useFocusParam()

  useEffect(() => {
    if (focusId == null || !data || data.length === 0) return
    const match = data.find((r) => r.id === focusId)
    if (!match) return
    setViewing(match)
    clearFocus()
  }, [focusId, data, clearFocus])

  const openCreate = () => {
    setEditing(null)
    setForm({ storeId: defaultStoreId(stores), requestedById: '', requiredDate: '', priority: 'NORMAL', remarks: '' })
    setLines([])
    setShowCreate(true)
  }

  const openEdit = (r: Requirement) => {
    setEditing(r)
    setForm({
      storeId: String(r.storeId),
      requestedById: String(r.requestedById),
      requiredDate: toDateInput(r.requiredDate),
      priority: r.priority,
      remarks: r.remarks ?? '',
    })
    setLines(
      (r.items ?? []).map((i) =>
        newLine({ itemId: String(i.itemId), quantity: String(i.quantity) }),
      ),
    )
    setShowCreate(true)
  }

  useEffect(() => {
    if (!showCreate || form.storeId) return
    const defaultId = defaultStoreId(stores)
    if (defaultId) setForm((f) => (f.storeId ? f : { ...f, storeId: defaultId }))
  }, [showCreate, stores, form.storeId])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      storeId: Number(form.storeId),
      requestedById: Number(form.requestedById),
      requiredDate: form.requiredDate,
      priority: form.priority,
      remarks: form.remarks || undefined,
      items: lines.map((l) => ({ itemId: Number(l.itemId), quantity: Number(l.quantity) })),
    }
    const res = editing
      ? await action.run(() => api.patch<Requirement>(`/requirements/${editing.id}`, payload))
      : await action.run(() => api.post<Requirement>('/requirements', payload))
    if (res) {
      setShowCreate(false)
      setEditing(null)
      reload()
      setViewing(res)
    }
  }

  const runAction = async (
    fn: () => Promise<unknown>,
    close?: () => void,
  ) => {
    const res = await action.run(fn)
    if (res) {
      reload()
      close?.()
    }
  }

  const openApprove = (r: Requirement) => {
    setApproveReq(r)
  }

  const storeName = (id: number) => stores?.find((s) => s.id === id)?.storeName ?? '—'
  const userName = (id: number) => users?.find((u) => u.id === id)?.name ?? '—'

  return (
    <div>
      <PageHeader
        title="Requirements"
        subtitle="Draft, approve and track item requirements through to delivery."
        actions={
          canCreate ? (
            <Button onClick={openCreate}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New Requirement
            </Button>
          ) : null
        }
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No requirements yet.</div>
        ) : (
          <Table headers={['Req #', 'Store', 'Requested By', 'Required Date', 'Priority', 'Status', 'Items', '']}>
            {data.map((r) => (
              <tr key={r.id} className="hover:bg-emerald-50/70">
                <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-950">{r.requirementNo}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{storeName(r.storeId)}</td>
                <td className="px-4 py-3">{userName(r.requestedById)}</td>
                <td className="px-4 py-3">{formatDate(r.requiredDate)}</td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(r.priority)}>{r.priority}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(r.status)}>{label(r.status)}</Badge>
                </td>
                <td className="px-4 py-3">{r._count?.items ?? r.items?.length ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {canEdit(r) ? (
                      <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>
                        Edit
                      </Button>
                    ) : null}
                    {canSubmit && (r.status === 'DRAFT' || r.status === 'REJECTED' || r.status === 'SUBMITTED') ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(() => api.post(`/requirements/${r.id}/submit`, {}))}
                      >
                        Submit
                      </Button>
                    ) : null}
                    {canManager && r.status === 'SUBMITTED' ? (
                      <Button size="sm" variant="secondary" onClick={() => setReviewReq(r)}>
                        Store Manager Review
                      </Button>
                    ) : null}
                    {canManager && r.status === 'PENDING_MANAGER_APPROVAL' ? (
                      <>
                        <Button size="sm" onClick={() => openApprove(r)}>
                          Manager Review
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setRejectReq(r)}>
                          Reject
                        </Button>
                      </>
                    ) : null}
                    {canWhatsApp && r.status === 'VENDOR_ASSIGNED' ? (
                      <>
                        <Button size="sm" onClick={() => setWaReq(r)}>
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runAction(() => api.post(`/requirements/${r.id}/mark-awaiting-delivery`, {}))}
                        >
                          Awaiting Delivery
                        </Button>
                      </>
                    ) : null}
                    {canManager && r.status === 'WHATSAPP_SENT' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(() => api.post(`/requirements/${r.id}/mark-awaiting-delivery`, {}))}
                      >
                        Awaiting Delivery
                      </Button>
                    ) : null}
                    {canVerify && (r.status === 'MATERIAL_RECEIVED' || r.status === 'VERIFICATION_PENDING') ? (
                      <Button size="sm" onClick={() => setVerifyReq(r)}>
                        Verify
                      </Button>
                    ) : null}
                    <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                      View
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false)
          setEditing(null)
        }}
        title={editing ? `Edit Requirement — ${editing.requirementNo}` : 'New Requirement'}
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Store" required value={form.storeId} onChange={(e) => setForm({ ...form, storeId: e.target.value })}>
              <option value="">— Select —</option>
              {stores?.map((s) => (
                <option key={s.id} value={String(s.id)}>{s.storeName}</option>
              ))}
            </Select>
            <Select label="Requested By" required value={form.requestedById} onChange={(e) => setForm({ ...form, requestedById: e.target.value })}>
              <option value="">— Select —</option>
              {users?.map((u) => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </Select>
            <Input
              label="Required Date"
              type="date"
              required
              value={form.requiredDate}
              onChange={(e) => setForm({ ...form, requiredDate: e.target.value })}
            />
            <Select label="Priority" required value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {priorities.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>

          <ItemLineEditor items={items ?? []} lines={lines} onChange={setLines} />

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Remarks</span>
            <textarea
              rows={2}
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {action.error && <div className="text-sm text-red-600">{action.error}</div>}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? (editing ? 'Saving…' : 'Creating…') : editing ? 'Save Changes' : 'Create Requirement'}
            </Button>
          </div>
        </form>
      </Modal>

      <StoreManagerReviewModal
        requirement={reviewReq}
        busy={action.submitting}
        onClose={() => setReviewReq(null)}
        onReview={(approve, remarks) =>
          runAction(() =>
            api.post(`/requirements/${reviewReq!.id}/store-manager-review`, { approve, remarks }),
            () => setReviewReq(null),
          )
        }
      />

      <ManagerApproveModal
        requirement={approveReq}
        vendors={vendors ?? []}
        busy={action.submitting}
        error={action.error}
        onClose={() => setApproveReq(null)}
        onApprove={(payload) =>
          runAction(() => api.post(`/requirements/${approveReq!.id}/approve`, payload), () => setApproveReq(null))
        }
      />

      <ManagerRejectModal
        requirement={rejectReq}
        busy={action.submitting}
        onClose={() => setRejectReq(null)}
        onReject={(remarks) =>
          runAction(() => api.post(`/requirements/${rejectReq!.id}/reject`, { approve: false, remarks }), () => setRejectReq(null))
        }
      />

      <WhatsAppModal
        requirement={waReq}
        busy={action.submitting}
        onClose={() => setWaReq(null)}
        onMarkSent={() =>
          runAction(() => api.post(`/requirements/${waReq!.id}/mark-whatsapp-sent`, {}), () => setWaReq(null))
        }
      />

      <VerifyRequirementModal
        requirement={verifyReq}
        busy={action.submitting}
        onClose={() => setVerifyReq(null)}
        onVerify={(approved) =>
          runAction(() => api.post(`/requirements/${verifyReq!.id}/verify`, { approved }), () => setVerifyReq(null))
        }
      />

      <RequirementDetail
        requirement={viewing}
        storeName={storeName}
        userName={userName}
        onClose={() => setViewing(null)}
      />

      {viewing && (
        <RequirementPrintSheet
          requirement={viewing}
          storeName={storeName}
          userName={userName}
        />
      )}
    </div>
  )
}

// --------------------------------------------------------------------------- modals

function StoreManagerReviewModal({
  requirement,
  busy,
  onClose,
  onReview,
}: {
  requirement: Requirement | null
  busy: boolean
  onClose: () => void
  onReview: (approve: boolean, remarks: string) => void
}) {
  const [remarks, setRemarks] = useState('')
  useEffect(() => setRemarks(''), [requirement])

  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`Store Manager Review — ${requirement?.requirementNo ?? ''}`}>
      {requirement && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Approve this requirement to send it to the manager, or reject it back to the requester.
          </p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Remarks</span>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => onReview(false, remarks)}>
              Reject
            </Button>
            <Button disabled={busy} onClick={() => onReview(true, remarks)}>
              Approve
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ManagerRejectModal({
  requirement,
  busy,
  onClose,
  onReject,
}: {
  requirement: Requirement | null
  busy: boolean
  onClose: () => void
  onReject: (remarks: string) => void
}) {
  const [remarks, setRemarks] = useState('')
  useEffect(() => setRemarks(''), [requirement])

  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`Reject — ${requirement?.requirementNo ?? ''}`}>
      {requirement && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Reject this requirement back to the requester.</p>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Reason (required)</span>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="danger" disabled={busy || !remarks.trim()} onClick={() => onReject(remarks)}>
              Reject Requirement
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function ManagerApproveModal({
  requirement,
  vendors,
  busy,
  error,
  onClose,
  onApprove,
}: {
  requirement: Requirement | null
  vendors: Vendor[]
  busy: boolean
  error: string | null
  onClose: () => void
  onApprove: (payload: {
    vendorId: number
    expectedDate: string
    notes?: string
    items: { itemId: number; orderedQty: number; unitPrice?: number }[]
  }) => void
}) {
  const [lines, setLines] = useState<ApproveLine[]>([])
  const [form, setForm] = useState({ vendorId: '', expectedDate: '', notes: '' })

  useEffect(() => {
    if (!requirement) return
    setLines(
      (requirement.items ?? []).map((i) => ({
        itemId: i.itemId,
        orderedQty: i.quantity,
        unitPrice: '',
      })),
    )
    setForm({ vendorId: '', expectedDate: '', notes: '' })
  }, [requirement])

  const setLine = (index: number, patch: Partial<ApproveLine>) =>
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)))

  const valid = form.vendorId && form.expectedDate && lines.length > 0 && lines.every((l) => l.orderedQty > 0)

  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`Manager Approval & Vendor Assignment — ${requirement?.requirementNo ?? ''}`} wide>
      {requirement && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Vendor"
              required
              value={form.vendorId}
              onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
            >
              <option value="">— Select —</option>
              {vendors.filter((v) => v.active).map((v) => (
                <option key={v.id} value={String(v.id)}>{v.vendorName}</option>
              ))}
            </Select>
            <Input
              label="Expected Delivery Date"
              type="date"
              required
              value={form.expectedDate}
              onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Order Lines</p>
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {lines.map((l, i) => {
                const item = requirement.items?.find((it) => it.itemId === l.itemId)
                return (
                  <div key={l.itemId} className="flex items-center gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{item?.Item?.itemName ?? `Item #${l.itemId}`}</p>
                      <p className="text-xs text-slate-400">{item?.Item?.unit ?? ''}</p>
                    </div>
                    <label className="w-24">
                      <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Qty</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={l.orderedQty}
                        onChange={(e) => setLine(i, { orderedQty: Number(e.target.value) })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                    <label className="w-28">
                      <span className="mb-0.5 block text-[11px] font-medium text-slate-500">Unit Price ₹</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={l.unitPrice}
                        onChange={(e) => setLine(i, { unitPrice: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                      />
                    </label>
                  </div>
                )
              })}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {error && <div className="text-sm text-red-600">{error}</div>}

          <p className="text-xs text-slate-500">
            Approving creates a purchase order and moves the requirement to "Vendor Assigned".
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button
              disabled={busy || !valid}
              onClick={() =>
                onApprove({
                  vendorId: Number(form.vendorId),
                  expectedDate: form.expectedDate,
                  notes: form.notes || undefined,
                  items: lines.map((l) => ({
                    itemId: l.itemId,
                    orderedQty: Number(l.orderedQty),
                    ...(l.unitPrice ? { unitPrice: Number(l.unitPrice) } : {}),
                  })),
                })
              }
            >
              {busy ? 'Creating PO…' : 'Approve & Assign Vendor'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function WhatsAppModal({
  requirement,
  busy,
  onClose,
  onMarkSent,
}: {
  requirement: Requirement | null
  busy: boolean
  onClose: () => void
  onMarkSent: () => void
}) {
  const [payload, setPayload] = useState<WhatsAppPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState('formal')

  useEffect(() => {
    if (!requirement) return
    let cancelled = false
    setPayload(null)
    setLoading(true)
    setError(null)
    setSelected('formal')
    api
      .get<WhatsAppPayload>(`/requirements/${requirement.id}/whatsapp-message`)
      .then((p) => {
        if (!cancelled) setPayload(p)
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [requirement])

  const current =
    payload?.formats?.find((f) => f.id === selected) ?? null
  const message = current?.message ?? payload?.message ?? ''
  const waLink = current?.waLink ?? payload?.waLink ?? null

  const copy = async () => {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`WhatsApp to Vendor — ${requirement?.requirementNo ?? ''}`} wide>
      {requirement && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Spinner className="h-7 w-7" /></div>
          ) : error ? (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : payload ? (
            <>
              <p className="text-sm text-slate-600">
                Send this order message to <span className="font-medium text-slate-800">{payload.vendor}</span>
                {payload.mobile ? ` (${payload.mobile})` : ''}. Copy it or open WhatsApp directly, then mark it as sent.
              </p>
              {payload.formats && payload.formats.length > 1 ? (
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-slate-700">Message format</legend>
                  <div className="flex flex-wrap gap-4">
                    {payload.formats.map((f) => (
                      <label key={f.id} className="inline-flex items-center gap-1.5 text-sm text-slate-700">
                        <input
                          type="radio"
                          name="wa-message-format"
                          value={f.id}
                          checked={selected === f.id}
                          onChange={() => setSelected(f.id)}
                          className="h-4 w-4 accent-emerald-600"
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <textarea
                readOnly
                rows={10}
                value={message}
                className="w-full rounded-md border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 outline-none"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={copy}>
                  {copied ? 'Copied!' : 'Copy Message'}
                </Button>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
                  >
                    Open WhatsApp
                  </a>
                )}
                <div className="flex-1" />
                <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button disabled={busy} onClick={onMarkSent}>
                  {busy ? 'Saving…' : 'Mark as Sent'}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function VerifyRequirementModal({
  requirement,
  busy,
  onClose,
  onVerify,
}: {
  requirement: Requirement | null
  busy: boolean
  onClose: () => void
  onVerify: (approved: boolean) => void
}) {
  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`Verify Material — ${requirement?.requirementNo ?? ''}`}>
      {requirement && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Expected Items</p>
            <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {(requirement.items ?? []).map((it) => (
                <div key={it.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-slate-800">{it.Item?.itemName ?? `Item #${it.itemId}`}</span>
                  <span className="text-slate-500">{it.quantity} {it.Item?.unit ?? ''}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-sm text-slate-600">
            Verified correct: the requirement is completed. Found a difference: report the issue from the
            Discrepancies page so the manager can follow up with the vendor.
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => onVerify(false)}>
              Found Difference
            </Button>
            <Button disabled={busy} onClick={() => onVerify(true)}>
              Verified Correct
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export function RequirementDetail({
  requirement,
  storeName,
  userName,
  onClose,
}: {
  requirement: Requirement | null
  storeName: (id: number) => string
  userName: (id: number) => string
  onClose: () => void
}) {
  return (
    <Modal open={Boolean(requirement)} onClose={onClose} title={`Requirement ${requirement?.requirementNo ?? ''}`} footer={<PrintButton />}>
      {requirement && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Store</p>
              <p className="font-medium text-slate-800">{storeName(requirement.storeId)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Requested By</p>
              <p className="font-medium text-slate-800">{userName(requirement.requestedById)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Required Date</p>
              <p className="font-medium text-slate-800">{formatDate(requirement.requiredDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
              <Badge color={badgeColor(requirement.status)}>{label(requirement.status)}</Badge>
            </div>
          </div>
          {requirement.remarks && (
            <p className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">{requirement.remarks}</p>
          )}
          <Table headers={['Item', 'Unit', 'Qty']}>
            {(requirement.items ?? []).map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-2.5">
                  <span className="font-medium text-emerald-950">{it.Item?.itemName ?? 'Item'}</span>
                  <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
                </td>
                <td className="px-4 py-2.5">{it.Item?.unit ?? '—'}</td>
                <td className="px-4 py-2.5 font-medium">{it.quantity}</td>
              </tr>
            ))}
          </Table>
        </div>
      )}
    </Modal>
  )
}

function RequirementPrintSheet({
  requirement,
  storeName,
  userName,
}: {
  requirement: Requirement
  storeName: (id: number) => string
  userName: (id: number) => string
}) {
  return (
    <PrintSheet
      title="Material Requirement"
      number={requirement.requirementNo}
      meta={[
        { label: 'Store', value: storeName(requirement.storeId) },
        { label: 'Requested By', value: userName(requirement.requestedById) },
        { label: 'Required Date', value: formatDate(requirement.requiredDate) },
        { label: 'Priority', value: requirement.priority },
        { label: 'Status', value: label(requirement.status) },
        { label: 'Raised On', value: formatDate(requirement.createdAt) },
      ]}
      columns={['Item', 'Unit', 'Qty']}
      rows={(requirement.items ?? []).map((it) => [
        <span key="n">
          {it.Item?.itemName ?? 'Item'}
          <span className="ml-2 font-mono text-xs text-slate-400">{it.Item?.itemCode}</span>
        </span>,
        it.Item?.unit ?? '—',
        it.quantity,
      ])}
    />
  )
}
