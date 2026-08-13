import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useFocusParam } from '../hooks/useFocus'
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
import type { Delivery, Discrepancy, PurchaseOrder } from '../types'

const types = ['SHORTAGE', 'EXCESS', 'DAMAGE', 'WRONG_ITEM', 'QUALITY', 'OTHER']

const label = (status: string) => status.replace(/_/g, ' ')

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
  formats?: WhatsAppFormatVariant[]
}

export default function DiscrepanciesPage() {
  const { user } = useAuth()
  const role = user?.role
  const canReport = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canStartReview = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canManager = role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canFinalManager = role === 'MANAGER' || role === 'ADMIN'
  const canWhatsApp = role === 'MANAGER' || role === 'ADMIN'
  const canTrack = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const canVerifyReplacement = role === 'STORE_KEEPER' || role === 'STORE_MANAGER' || role === 'MANAGER' || role === 'ADMIN'
  const { data, loading, error, reload } = useFetch<Discrepancy[]>('/discrepancies')
  const { data: pos } = useFetch<PurchaseOrder[]>('/purchase-orders')
  const { data: deliveries } = useFetch<Delivery[]>('/deliveries')
  const action = useApiAction()

  const [showCreate, setShowCreate] = useState(false)
  const [reviewDis, setReviewDis] = useState<Discrepancy | null>(null)
  const [waDis, setWaDis] = useState<Discrepancy | null>(null)
  const [verifyDis, setVerifyDis] = useState<Discrepancy | null>(null)
  const [form, setForm] = useState({
    poId: '',
    deliveryId: '',
    itemId: '',
    discrepancyType: 'SHORTAGE',
    quantity: '',
    description: '',
  })
  const { focusId, clearFocus } = useFocusParam()
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    const poId = searchParams.get('poId')
    const deliveryId = searchParams.get('deliveryId')
    if (!canReport || !poId || !deliveryId) return
    setForm((f) => ({ ...f, poId, deliveryId }))
    setShowCreate(true)
    setSearchParams({}, { replace: true })
  }, [canReport, searchParams, setSearchParams])

  useEffect(() => {
    if (focusId == null || !data || data.length === 0) return
    if (!data.some((d) => d.id === focusId)) return
    setHighlightId(focusId)
    clearFocus()
  }, [focusId, data, clearFocus])

  useEffect(() => {
    if (highlightId == null) return
    const el = document.getElementById(`disc-row-${highlightId}`)
    if (typeof el?.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
    const timer = setTimeout(() => setHighlightId(null), 2500)
    return () => clearTimeout(timer)
  }, [highlightId])

  const poDeliveries = deliveries?.filter((d) => d.poId === Number(form.poId)) ?? []
  const selectedDelivery = deliveries?.find((d) => d.id === Number(form.deliveryId))

  const openCreate = () => {
    setForm({ poId: '', deliveryId: '', itemId: '', discrepancyType: 'SHORTAGE', quantity: '', description: '' })
    setShowCreate(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const payload = {
      poId: Number(form.poId),
      deliveryId: Number(form.deliveryId),
      itemId: Number(form.itemId),
      discrepancyType: form.discrepancyType,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      description: form.description || undefined,
    }
    const res = await action.run(() => api.post<Discrepancy>('/discrepancies', payload))
    if (res) {
      setShowCreate(false)
      reload()
    }
  }

  const runAction = async (fn: () => Promise<unknown>, close?: () => void) => {
    const res = await action.run(fn)
    if (res) {
      reload()
      close?.()
    }
  }

  return (
    <div>
      <PageHeader
        title="Discrepancies"
        subtitle="Damaged, short or mismatched items reported against deliveries."
        actions={
          canReport ? (
            <Button onClick={openCreate}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              Report Discrepancy
            </Button>
          ) : null
        }
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No discrepancies reported.</div>
        ) : (
          <Table headers={['PO', 'Delivery', 'Item', 'Type', 'Qty', 'Status', 'Reported', '']}>
            {data.map((d) => (
              <tr
                key={d.id}
                id={`disc-row-${d.id}`}
                className={d.id === highlightId ? 'bg-amber-50' : 'hover:bg-emerald-50/70'}
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-emerald-950">
                  {d.PurchaseOrder?.poNumber ?? '—'}
                </td>
                <td className="px-4 py-3">{formatDate(d.Delivery?.deliveryDate)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{d.Item?.itemName ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(d.discrepancyType)}>{label(d.discrepancyType)}</Badge>
                </td>
                <td className="px-4 py-3">{d.quantity ?? '—'}</td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(d.status)}>{label(d.status)}</Badge>
                </td>
                <td className="px-4 py-3">{formatDate(d.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {canStartReview && d.status === 'ISSUE_RAISED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(() => api.post(`/discrepancies/${d.id}/start-review`, {}))}
                      >
                        Start Review
                      </Button>
                    ) : null}
                    {canFinalManager && (d.status === 'ISSUE_RAISED' || d.status === 'MANAGER_REVIEW') ? (
                      <Button size="sm" onClick={() => setReviewDis(d)}>
                        Manager Review
                      </Button>
                    ) : null}
                    {canWhatsApp && d.status === 'VENDOR_NOTIFIED' ? (
                      <>
                        <Button size="sm" onClick={() => setWaDis(d)}>
                          WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => runAction(() => api.post(`/discrepancies/${d.id}/await-replacement`, {}))}
                        >
                          Awaiting Replacement
                        </Button>
                      </>
                    ) : null}
                    {canTrack && d.status === 'REPLACEMENT_AWAITED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => runAction(() => api.post(`/discrepancies/${d.id}/replacement-received`, {}))}
                      >
                        Replacement Received
                      </Button>
                    ) : null}
                    {canVerifyReplacement && d.status === 'REPLACEMENT_RECEIVED' ? (
                      <Button size="sm" onClick={() => setVerifyDis(d)}>
                        Verify Replacement
                      </Button>
                    ) : null}
                    {canManager && d.status === 'VERIFIED' ? (
                      <Button
                        size="sm"
                        onClick={() => runAction(() => api.post(`/discrepancies/${d.id}/complete`, {}))}
                      >
                        Complete
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Report Discrepancy" wide>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Purchase Order"
              required
              value={form.poId}
              onChange={(e) => setForm({ ...form, poId: e.target.value, deliveryId: '', itemId: '' })}
            >
              <option value="">— Select —</option>
              {pos?.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.poNumber} — {p.Vendor?.vendorName ?? ''}</option>
              ))}
            </Select>
            <Select
              label="Delivery"
              required
              value={form.deliveryId}
              onChange={(e) => setForm({ ...form, deliveryId: e.target.value, itemId: '' })}
              disabled={!form.poId}
            >
              <option value="">{form.poId ? '— Select delivery —' : 'Select a PO first'}</option>
              {poDeliveries.map((d) => (
                <option key={d.id} value={String(d.id)}>
                  Delivery #{d.id} — {formatDate(d.deliveryDate)} ({d.status})
                </option>
              ))}
            </Select>
            <Select
              label="Item"
              required
              value={form.itemId}
              onChange={(e) => setForm({ ...form, itemId: e.target.value })}
              disabled={!form.deliveryId}
            >
              <option value="">{form.deliveryId ? '— Select item —' : 'Select a delivery first'}</option>
              {(selectedDelivery?.items ?? []).map((it) => (
                <option key={it.id} value={String(it.itemId)}>
                  {it.Item?.itemName ?? 'Item'} ({it.receivedQty} received)
                </option>
              ))}
            </Select>
            <Select
              label="Type"
              required
              value={form.discrepancyType}
              onChange={(e) => setForm({ ...form, discrepancyType: e.target.value })}
            >
              {types.map((t) => (
                <option key={t} value={t}>{label(t)}</option>
              ))}
            </Select>
            <Input
              label="Quantity Affected"
              type="number"
              min="0"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </label>

          {action.error && <div className="text-sm text-red-600">{action.error}</div>}

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? 'Saving…' : 'Report'}
            </Button>
          </div>
        </form>
      </Modal>

      <DiscrepancyReviewModal
        discrepancy={reviewDis}
        busy={action.submitting}
        onClose={() => setReviewDis(null)}
        onReview={(approve, remarks) =>
          runAction(() => api.post(`/discrepancies/${reviewDis!.id}/manager-review`, { approve, remarks }), () => setReviewDis(null))
        }
      />

      <DiscrepancyWhatsAppModal
        discrepancy={waDis}
        onClose={() => setWaDis(null)}
      />

      <DiscrepancyVerifyModal
        discrepancy={verifyDis}
        busy={action.submitting}
        onClose={() => setVerifyDis(null)}
        onVerify={(approved) =>
          runAction(() => api.post(`/discrepancies/${verifyDis!.id}/verify`, { approved }), () => setVerifyDis(null))
        }
      />
    </div>
  )
}

// --------------------------------------------------------------------------- modals

function DiscrepancyReviewModal({
  discrepancy,
  busy,
  onClose,
  onReview,
}: {
  discrepancy: Discrepancy | null
  busy: boolean
  onClose: () => void
  onReview: (approve: boolean, remarks: string) => void
}) {
  const [remarks, setRemarks] = useState('')
  useEffect(() => setRemarks(''), [discrepancy])

  return (
    <Modal open={Boolean(discrepancy)} onClose={onClose} title="Manager Review — Issue">
      {discrepancy && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Approve the issue to notify the vendor for a replacement, or reject it as invalid.
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
              Reject Issue
            </Button>
            <Button disabled={busy} onClick={() => onReview(true, remarks)}>
              Approve & Notify Vendor
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function DiscrepancyWhatsAppModal({
  discrepancy,
  onClose,
}: {
  discrepancy: Discrepancy | null
  onClose: () => void
}) {
  const [payload, setPayload] = useState<WhatsAppPayload | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selected, setSelected] = useState('formal')

  useEffect(() => {
    if (!discrepancy) return
    let cancelled = false
    setPayload(null)
    setLoading(true)
    setError(null)
    setSelected('formal')
    api
      .get<WhatsAppPayload>(`/discrepancies/${discrepancy.id}/whatsapp-message`)
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
  }, [discrepancy])

  const current = payload?.formats?.find((f) => f.id === selected) ?? null
  const message = current?.message ?? payload?.message ?? ''
  const waLink = current?.waLink ?? payload?.waLink ?? null

  const copy = async () => {
    if (!message) return
    await navigator.clipboard.writeText(message)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={Boolean(discrepancy)} onClose={onClose} title="WhatsApp to Vendor — Replacement">
      {discrepancy && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10"><Spinner className="h-7 w-7" /></div>
          ) : error ? (
            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          ) : payload ? (
            <>
              <p className="text-sm text-slate-600">
                Send this replacement request to <span className="font-medium text-slate-800">{payload.vendor}</span>
                {payload.mobile ? ` (${payload.mobile})` : ''}.
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
                rows={9}
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
                <Button variant="secondary" onClick={onClose}>Close</Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </Modal>
  )
}

function DiscrepancyVerifyModal({
  discrepancy,
  busy,
  onClose,
  onVerify,
}: {
  discrepancy: Discrepancy | null
  busy: boolean
  onClose: () => void
  onVerify: (approved: boolean) => void
}) {
  return (
    <Modal open={Boolean(discrepancy)} onClose={onClose} title="Verify Replacement">
      {discrepancy && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Did the replacement fix the issue? Approving marks it verified; otherwise the issue is reopened.
          </p>
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="danger" disabled={busy} onClick={() => onVerify(false)}>
              Still Not OK
            </Button>
            <Button disabled={busy} onClick={() => onVerify(true)}>
              Replacement Verified
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
