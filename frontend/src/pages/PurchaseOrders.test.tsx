import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import PurchaseOrdersPage from './PurchaseOrders'
import type { Item, PurchaseOrder, Requirement, User, Vendor } from '../types'

const mocks = vi.hoisted(() => ({
  role: 'MANAGER',
  pos: [] as PurchaseOrder[],
  requirements: [] as Requirement[],
  vendors: [] as Vendor[],
  users: [] as User[],
  items: [] as Item[],
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', mobile: '9999999999', email: null, role: mocks.role, status: 'ACTIVE' },
  }),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: {
      '/purchase-orders': mocks.pos,
      '/requirements': mocks.requirements,
      '/vendors': mocks.vendors,
      '/users': mocks.users,
      '/items': mocks.items,
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

const user: User = {
  id: 1,
  name: 'Ramesh',
  mobile: '9999999999',
  email: null,
  role: 'STORE_KEEPER',
  status: 'ACTIVE',
  permissions: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const item: Item = {
  id: 1,
  itemCode: 'ITM-1',
  itemName: 'Cement',
  categoryId: 1,
  unit: 'bag',
  preferredVendorId: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const vendor: Vendor = {
  id: 1,
  vendorName: 'Acme Supplies',
  contactPerson: 'Ravi',
  mobile: '9876543210',
  whatsapp: null,
  email: 'acme@example.com',
  address: null,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

const makeReq = (over: Partial<Requirement>): Requirement => ({
  id: 1,
  requirementNo: 'REQ-0001',
  storeId: 1,
  requestedById: 1,
  requiredDate: '2026-08-01T00:00:00Z',
  priority: 'HIGH',
  status: 'VENDOR_ASSIGNED',
  approvedById: null,
  remarks: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  Store: { id: 1, storeName: 'Main Store' },
  items: [],
  _count: { items: 0, PurchaseOrder: 0 },
  ...over,
})

const reqItem = () => ({
  id: 1,
  requirementId: 1,
  itemId: 1,
  quantity: 10,
  Item: { id: 1, itemCode: 'ITM-1', itemName: 'Cement', unit: 'bag' },
})

const makePo = (over: Partial<PurchaseOrder>): PurchaseOrder => ({
  id: 1,
  poNumber: 'PO-0001',
  requirementId: 1,
  vendorId: 1,
  orderDate: '2026-08-01T00:00:00Z',
  expectedDate: '2026-09-01T00:00:00Z',
  status: 'PENDING',
  notes: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  Vendor: { id: 1, vendorName: 'Acme Supplies' },
  Requirement: { id: 1, requirementNo: 'REQ-0001', status: 'VENDOR_ASSIGNED' },
  items: [
    {
      id: 1,
      poId: 1,
      itemId: 1,
      orderedQty: 10,
      receivedQty: 0,
      unitPrice: 100,
      Item: { id: 1, itemCode: 'ITM-1', itemName: 'Cement', unit: 'bag' },
    },
  ],
  _count: { items: 1, Delivery: 0 },
  ...over,
})

const renderPage = (path = '/purchase-orders') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PurchaseOrdersPage />
    </MemoryRouter>,
  )

describe('PurchaseOrdersPage', () => {
  beforeEach(() => {
    mocks.pos = []
    mocks.requirements = []
    mocks.vendors = []
    mocks.users = []
    mocks.items = []
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows New Purchase Order only to managers and admins', () => {
    mocks.role = 'MANAGER'
    renderPage()
    expect(screen.getByRole('button', { name: /new purchase order/i })).toBeInTheDocument()
  })

  it('hides New Purchase Order from store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    renderPage()
    expect(screen.queryByRole('button', { name: /new purchase order/i })).not.toBeInTheDocument()
  })

  it('shows Deliver to store keeper for an open PO', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.pos = [makePo({})]
    renderPage()
    expect(screen.getByRole('button', { name: /deliver/i })).toBeInTheDocument()
  })

  it('hides Deliver from manager', () => {
    mocks.role = 'MANAGER'
    mocks.pos = [makePo({})]
    renderPage()
    expect(screen.queryByRole('button', { name: /deliver/i })).not.toBeInTheDocument()
  })

  it('hides Deliver for a COMPLETED PO', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.pos = [makePo({ status: 'COMPLETED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /deliver/i })).not.toBeInTheDocument()
  })

  it('shows a partially received badge for a PO with partial deliveries', () => {
    mocks.role = 'MANAGER'
    mocks.pos = [
      makePo({
        items: [{ ...makePo({}).items![0], orderedQty: 10, receivedQty: 4 }],
      }),
    ]
    renderPage()
    expect(screen.getByText(/partially received/i)).toBeInTheDocument()
  })

  it('opens the create modal from New Purchase Order', async () => {
    const user = userEvent.setup()
    mocks.role = 'MANAGER'
    renderPage()
    await user.click(screen.getByRole('button', { name: /new purchase order/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create purchase order/i })).toBeInTheDocument()
  })

  it('creates a purchase order with items pre-filled from the requirement', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.requirements = [makeReq({})]
    mocks.vendors = [vendor]
    mocks.items = [item]
    mocks.apiGet.mockResolvedValue(makeReq({ items: [reqItem()] }))
    mocks.apiPost.mockResolvedValue(makePo({}))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /new purchase order/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.selectOptions(within(dialog).getByLabelText(/requirement/i), '1')
    expect(await within(dialog).findByText(/pre-filled from REQ-0001/i)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/requirements/1')
    await userEv.selectOptions(within(dialog).getByLabelText(/vendor/i), '1')
    fireEvent.change(within(dialog).getByLabelText(/expected date/i), { target: { value: '2026-09-05' } })
    await userEv.click(within(dialog).getByRole('button', { name: /create purchase order/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/purchase-orders', {
      requirementId: 1,
      vendorId: 1,
      expectedDate: '2026-09-05',
      notes: undefined,
      items: [{ itemId: 1, orderedQty: 10 }],
    })
    const detail = await screen.findByRole('dialog')
    expect(within(detail).getByText('Acme Supplies')).toBeInTheDocument()
  })

  it('opens the record delivery modal from Deliver', async () => {
    const user = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.pos = [makePo({})]
    renderPage()
    await user.click(screen.getByRole('button', { name: /deliver/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save delivery/i })).toBeInTheDocument()
  })

  it('records a delivery against an open PO', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.pos = [makePo({})]
    mocks.users = [user]
    mocks.items = [item]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /deliver/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.selectOptions(within(dialog).getByLabelText(/received by/i), '1')
    await userEv.selectOptions(within(dialog).getByLabelText(/status/i), 'FULL')
    fireEvent.change(within(dialog).getByLabelText(/delivery date/i), { target: { value: '2026-09-01' } })
    await userEv.type(within(dialog).getByLabelText(/remarks/i), 'All good')
    await userEv.click(within(dialog).getByRole('button', { name: /save delivery/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/deliveries', {
      poId: 1,
      receivedById: 1,
      deliveryDate: '2026-09-01',
      status: 'FULL',
      remarks: 'All good',
      items: [{ itemId: 1, receivedQty: 10, condition: 'GOOD' }],
    })
  })

  it('opens the PO detail with line totals from View', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.pos = [
      makePo({
        notes: 'Rush order',
        items: [{ ...makePo({}).items![0], receivedQty: 4 }],
      }),
    ]
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^view$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Acme Supplies')).toBeInTheDocument()
    expect(within(dialog).getByText('REQ-0001')).toBeInTheDocument()
    expect(within(dialog).getByText('Rush order')).toBeInTheDocument()
    expect(within(dialog).getByText('Cement')).toBeInTheDocument()
    expect(within(dialog).getByText('ITM-1')).toBeInTheDocument()
    expect(within(dialog).getByText('Total')).toBeInTheDocument()
    expect(within(dialog).getAllByText('₹1,000')).toHaveLength(2)
  })

  it('opens the PO detail directly from a focus param', () => {
    mocks.role = 'MANAGER'
    mocks.pos = [makePo({ poNumber: 'PO-FOCUS' })]
    renderPage('/purchase-orders?focus=1')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/PO-FOCUS/)).toBeInTheDocument()
    expect(within(dialog).getByText('Acme Supplies')).toBeInTheDocument()
  })
})
