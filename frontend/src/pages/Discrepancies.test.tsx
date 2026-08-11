import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DiscrepanciesPage from './Discrepancies'
import type { Discrepancy, Delivery, PurchaseOrder } from '../types'

const mocks = vi.hoisted(() => ({
  role: 'STORE_KEEPER',
  dis: [] as Discrepancy[],
  pos: [] as PurchaseOrder[],
  deliveries: [] as Delivery[],
  apiPost: vi.fn(),
  apiGet: vi.fn(),
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', mobile: '9999999999', email: null, role: mocks.role, status: 'ACTIVE' },
  }),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: {
      '/discrepancies': mocks.dis,
      '/purchase-orders': mocks.pos,
      '/deliveries': mocks.deliveries,
    }[path] ?? null,
    loading: false,
    error: null,
    reload: () => {},
  }),
  useApiAction: () => ({
    submitting: false,
    error: null,
    clearError: () => {},
    run: async <T,>(fn: () => Promise<T>) => fn(),
  }),
}))

vi.mock('../lib/api', () => ({
  api: { get: mocks.apiGet, post: mocks.apiPost },
}))

const po: PurchaseOrder = {
  id: 1,
  poNumber: 'PO-001',
  requirementId: 1,
  vendorId: 1,
  orderDate: '2026-08-01T00:00:00Z',
  expectedDate: '2026-09-01T00:00:00Z',
  status: 'PARTIAL',
  notes: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  Vendor: { id: 1, vendorName: 'Acme Supplies' },
}

const delivery: Delivery = {
  id: 1,
  poId: 1,
  deliveryDate: '2026-08-02T00:00:00Z',
  receivedById: 1,
  status: 'FULL',
  remarks: null,
  createdAt: '2026-08-02T00:00:00Z',
  items: [
    {
      id: 1,
      deliveryId: 1,
      itemId: 1,
      receivedQty: 10,
      condition: 'GOOD',
      remarks: null,
      Item: { id: 1, itemCode: 'ITM-1', itemName: 'Cement', unit: 'bag' },
    },
  ],
}

const makeDis = (over: Partial<Discrepancy>): Discrepancy => ({
  id: 1,
  poId: 1,
  deliveryId: 1,
  itemId: 1,
  discrepancyType: 'SHORTAGE',
  quantity: 2,
  description: 'Missing items',
  photo: null,
  status: 'ISSUE_RAISED',
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  Item: { id: 1, itemCode: 'ITM-1', itemName: 'Cement', unit: 'bag' },
  Delivery: { id: 1, deliveryDate: '2026-08-02T00:00:00Z', status: 'FULL' },
  PurchaseOrder: { id: 1, poNumber: 'PO-001', status: 'PARTIAL' },
  ...over,
})

const renderPage = (path = '/discrepancies') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <DiscrepanciesPage />
    </MemoryRouter>,
  )

describe('DiscrepanciesPage', () => {
  beforeEach(() => {
    mocks.dis = []
    mocks.pos = []
    mocks.deliveries = []
    mocks.apiPost.mockReset()
    mocks.apiGet.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows Report Discrepancy only to store keepers and admins', () => {
    mocks.role = 'STORE_KEEPER'
    renderPage()
    expect(screen.getByRole('button', { name: /report discrepancy/i })).toBeInTheDocument()
  })

  it('hides Report Discrepancy for manager and purchaser', () => {
    mocks.role = 'MANAGER'
    renderPage()
    expect(screen.queryByRole('button', { name: /report discrepancy/i })).not.toBeInTheDocument()

    mocks.role = 'PURCHASER'
    renderPage()
    expect(screen.queryByRole('button', { name: /report discrepancy/i })).not.toBeInTheDocument()
  })

  it('shows Start Review to store keeper for ISSUE_RAISED', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({})]
    renderPage()
    expect(screen.getByRole('button', { name: /start review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /manager review/i })).toBeInTheDocument()
  })

  it('hides Start Review from purchaser', () => {
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({})]
    renderPage()
    expect(screen.queryByRole('button', { name: /start review/i })).not.toBeInTheDocument()
  })

  it('shows Manager Review for MANAGER_REVIEW only to manager/admin', () => {
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'MANAGER_REVIEW' })]
    renderPage()
    expect(screen.getByRole('button', { name: /manager review/i })).toBeInTheDocument()
  })

  it('hides Manager Review from store keeper for MANAGER_REVIEW', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'MANAGER_REVIEW' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /manager review/i })).not.toBeInTheDocument()
  })

  it('shows WhatsApp and Awaiting Replacement to purchaser for VENDOR_NOTIFIED', () => {
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({ status: 'VENDOR_NOTIFIED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /awaiting replacement/i })).toBeInTheDocument()
  })

  it('hides WhatsApp actions from store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'VENDOR_NOTIFIED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument()
  })

  it('shows Replacement Received to store keeper for REPLACEMENT_AWAITED', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_AWAITED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /replacement received/i })).toBeInTheDocument()
  })

  it('hides Replacement Received from purchaser', () => {
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_AWAITED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /replacement received/i })).not.toBeInTheDocument()
  })

  it('shows Verify Replacement to store keeper for REPLACEMENT_RECEIVED', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_RECEIVED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /verify replacement/i })).toBeInTheDocument()
  })

  it('hides Verify Replacement from manager', () => {
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_RECEIVED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /verify replacement/i })).not.toBeInTheDocument()
  })

  it('shows Complete to manager for VERIFIED', () => {
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'VERIFIED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument()
  })

  it('hides Complete from store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'VERIFIED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument()
  })

  it('opens the report modal from the Report Discrepancy button', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /report discrepancy/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report' })).toBeInTheDocument()
  })

  it('reports a discrepancy with linked PO, delivery and item', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.pos = [po]
    mocks.deliveries = [delivery]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /report discrepancy/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.selectOptions(within(dialog).getByLabelText(/^purchase order/i), '1')
    await userEv.selectOptions(within(dialog).getByLabelText(/^delivery/i), '1')
    await userEv.selectOptions(within(dialog).getByLabelText(/^item/i), '1')
    await userEv.type(within(dialog).getByLabelText(/quantity affected/i), '3')
    await userEv.type(within(dialog).getByRole('textbox'), 'Broken bags')
    await userEv.click(within(dialog).getByRole('button', { name: 'Report' }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies', {
      poId: 1,
      deliveryId: 1,
      itemId: 1,
      discrepancyType: 'SHORTAGE',
      quantity: 3,
      description: 'Broken bags',
    })
  })

  it('starts the review from an ISSUE_RAISED discrepancy', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({})]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /start review/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/start-review', {})
  })

  it('approves the issue to notify the vendor', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'MANAGER_REVIEW' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /manager review/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /approve & notify vendor/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/manager-review', { approve: true, remarks: '' })
  })

  it('rejects the issue as invalid', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'MANAGER_REVIEW' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /manager review/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.type(within(dialog).getByRole('textbox'), 'No evidence')
    await userEv.click(within(dialog).getByRole('button', { name: /reject issue/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/manager-review', { approve: false, remarks: 'No evidence' })
  })

  it('loads the replacement WhatsApp message', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({ status: 'VENDOR_NOTIFIED' })]
    mocks.apiGet.mockResolvedValue({
      message: 'Please replace the missing items',
      waLink: 'https://wa.me/9876543210?text=x',
      mobile: '9876543210',
      vendor: 'Acme Supplies',
      poNumber: 'PO-001',
    })
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Acme Supplies')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /open whatsapp/i })).toBeInTheDocument()
    await userEv.click(within(dialog).getByRole('button', { name: /close/i }))
    expect(within(dialog).queryByText('Acme Supplies')).not.toBeInTheDocument()
  })

  it('shows an error when the replacement message fails to load', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({ status: 'VENDOR_NOTIFIED' })]
    mocks.apiGet.mockRejectedValue(new Error('Failed to load'))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    expect(await screen.findByText('Failed to load')).toBeInTheDocument()
  })

  it('marks a VENDOR_NOTIFIED discrepancy as awaiting replacement', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'PURCHASER'
    mocks.dis = [makeDis({ status: 'VENDOR_NOTIFIED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /awaiting replacement/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/await-replacement', {})
  })

  it('records a replacement as received', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_AWAITED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /replacement received/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/replacement-received', {})
  })

  it('verifies the replacement fixes the issue', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_RECEIVED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /verify replacement/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /replacement verified/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/verify', { approved: true })
  })

  it('reopens the issue when the replacement is still not ok', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ status: 'REPLACEMENT_RECEIVED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /verify replacement/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /still not ok/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/verify', { approved: false })
  })

  it('completes a verified discrepancy', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.dis = [makeDis({ status: 'VERIFIED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^complete$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/discrepancies/1/complete', {})
  })

  it('highlights the row targeted by a focus param', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.dis = [makeDis({ id: 7, discrepancyType: 'DAMAGE' })]
    renderPage('/discrepancies?focus=7')
    const row = screen.getByText('DAMAGE').closest('tr')
    expect(row).not.toBeNull()
    expect(row!.className).toContain('bg-amber-50')
  })
})
