import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import RequirementsPage from './Requirements'
import type { Requirement, Item, Store, User, Vendor } from '../types'

const mocks = vi.hoisted(() => ({
  role: 'STORE_KEEPER',
  reqs: [] as Requirement[],
  stores: [] as Store[],
  users: [] as User[],
  items: [] as Item[],
  vendors: [] as Vendor[],
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
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
      '/requirements': mocks.reqs,
      '/stores': mocks.stores,
      '/users': mocks.users,
      '/items': mocks.items,
      '/vendors': mocks.vendors,
    }[path] ?? null,
    loading: false,
    error: null,
    reload: () => {},
  }),
  useApiAction: () => ({
    submitting: false,
    error: null,
    clearError: () => {},
    run: async <T,>(fn: () => Promise<T>) => {
      try {
        return await fn()
      } catch {
        return undefined
      }
    },
  }),
}))

vi.mock('../lib/api', () => ({
  api: { get: mocks.apiGet, post: mocks.apiPost, patch: mocks.apiPatch },
}))

const store: Store = { id: 1, storeName: 'IPS Main Store', location: null, createdAt: '2026-01-01T00:00:00Z' }
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
  requirementNo: 'REQ-TEST-1',
  storeId: 1,
  requestedById: 1,
  requiredDate: '2026-09-01T12:00:00Z',
  priority: 'HIGH',
  status: 'DRAFT',
  approvedById: null,
  remarks: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
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

const renderPage = (path = '/requirements') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <RequirementsPage />
    </MemoryRouter>,
  )

describe('RequirementsPage', () => {
  beforeEach(() => {
    mocks.reqs = []
    mocks.stores = []
    mocks.users = []
    mocks.items = []
    mocks.vendors = []
    mocks.apiPost.mockReset()
    mocks.apiPatch.mockReset()
    mocks.apiGet.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows New Requirement to store keepers, store managers, managers and admins', () => {
    mocks.role = 'STORE_KEEPER'
    renderPage()
    expect(screen.getByRole('button', { name: /new requirement/i })).toBeInTheDocument()

    mocks.role = 'STORE_MANAGER'
    cleanup()
    renderPage()
    expect(screen.getByRole('button', { name: /new requirement/i })).toBeInTheDocument()

    mocks.role = 'MANAGER'
    cleanup()
    renderPage()
    expect(screen.getByRole('button', { name: /new requirement/i })).toBeInTheDocument()
  })

  it('lets store keeper submit a DRAFT requirement', async () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'DRAFT' })]
    mocks.apiPost.mockResolvedValue({})
    const userEv = userEvent.setup()
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /submit/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/submit', {})
  })

  it('hides manager review actions from store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'PENDING_MANAGER_APPROVAL' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /manager review/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })

  it('shows manager review and reject to a manager', () => {
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'PENDING_MANAGER_APPROVAL' })]
    renderPage()
    expect(screen.getByRole('button', { name: /manager review/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument()
  })

  it('hides final Manager Review from store manager but keeps Store Manager Review', () => {
    mocks.role = 'STORE_MANAGER'
    mocks.reqs = [makeReq({ status: 'SUBMITTED' }), makeReq({ id: 2, status: 'PENDING_MANAGER_APPROVAL' })]
    renderPage()
    expect(screen.getByRole('button', { name: 'Store Manager Review' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Manager Review' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument()
  })

  it('shows WhatsApp and Awaiting Delivery to manager for VENDOR_ASSIGNED', () => {
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /whatsapp/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /awaiting delivery/i })).toBeInTheDocument()
  })

  it('hides WhatsApp actions from store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /whatsapp/i })).not.toBeInTheDocument()
  })

  it('shows Awaiting Delivery to manager for WHATSAPP_SENT', () => {
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'WHATSAPP_SENT' })]
    renderPage()
    expect(screen.getByRole('button', { name: /awaiting delivery/i })).toBeInTheDocument()
  })

  it('shows Verify to store keeper for MATERIAL_RECEIVED', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'MATERIAL_RECEIVED' })]
    renderPage()
    expect(screen.getByRole('button', { name: /verify/i })).toBeInTheDocument()
  })

  it('opens the create modal from the New Requirement button', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /new requirement/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/create requirement/i)).toBeInTheDocument()
  })

  it('hides inactive users from the Requested By dropdown', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.users = [
      user,
      { ...user, id: 2, name: 'Left The Org', status: 'INACTIVE' },
    ]
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /new requirement/i }))
    const dialog = screen.getByRole('dialog')
    const requestedBy = within(dialog).getByLabelText(/requested by/i)
    expect(within(requestedBy).getByRole('option', { name: 'Ramesh' })).toBeInTheDocument()
    expect(within(requestedBy).queryByRole('option', { name: 'Left The Org' })).not.toBeInTheDocument()
  })

  it('creates a requirement with line items', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.stores = [store]
    mocks.users = [user]
    mocks.items = [item]
    mocks.apiPost.mockResolvedValue(makeReq({ status: 'DRAFT', items: [reqItem()] }))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /new requirement/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.selectOptions(within(dialog).getByLabelText(/store/i), '1')
    await userEv.selectOptions(within(dialog).getByLabelText(/requested by/i), '1')
    fireEvent.change(within(dialog).getByLabelText(/required date/i), { target: { value: '2026-09-01' } })
    await userEv.click(within(dialog).getByRole('button', { name: /add item/i }))
    const selects = within(dialog).getAllByRole('combobox')
    const itemSelect = selects.find((s) => within(s).queryByRole('option', { name: /select item/i }))!
    await userEv.selectOptions(itemSelect, '1')
    await userEv.type(within(dialog).getByPlaceholderText('Qty'), '5')
    await userEv.type(within(dialog).getByRole('textbox'), 'Urgent request')
    await userEv.click(within(dialog).getByRole('button', { name: /create requirement/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements', {
      storeId: 1,
      requestedById: 1,
      requiredDate: '2026-09-01',
      priority: 'NORMAL',
      remarks: 'Urgent request',
      items: [{ itemId: 1, quantity: 5 }],
    })
  })

  it('defaults the store to IPS Main Store when creating a requirement', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.stores = [
      { id: 2, storeName: 'Central Warehouse', location: null, createdAt: '2026-01-01T00:00:00Z' },
      { id: 1, storeName: 'IPS Main Store', location: null, createdAt: '2026-01-01T00:00:00Z' },
    ]
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /new requirement/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByLabelText(/store/i)).toHaveValue('1')
  })

  it('lets a store keeper edit their own DRAFT requirement before submitting', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.stores = [store]
    mocks.users = [user]
    mocks.items = [item]
    mocks.reqs = [makeReq({ status: 'DRAFT', remarks: 'Original note', items: [reqItem()] })]
    mocks.apiPatch.mockResolvedValue(makeReq({ status: 'DRAFT', remarks: 'Original note updated' }))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/edit requirement/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/store/i)).toHaveValue('1')
    expect(within(dialog).getByLabelText(/requested by/i)).toHaveValue('1')
    expect(within(dialog).getByLabelText(/required date/i)).toHaveValue('2026-09-01')
    expect(within(dialog).getByRole('textbox')).toHaveValue('Original note')
    await userEv.type(within(dialog).getByRole('textbox'), ' updated')
    await userEv.click(within(dialog).getByRole('button', { name: /save changes/i }))
    expect(mocks.apiPatch).toHaveBeenCalledWith('/requirements/1', {
      storeId: 1,
      requestedById: 1,
      requiredDate: '2026-09-01',
      priority: 'HIGH',
      remarks: 'Original note updated',
      items: [{ itemId: 1, quantity: 10 }],
    })
  })

  it('hides Edit for a draft created by another store keeper', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'DRAFT', requestedById: 2 })]
    renderPage()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('hides Edit once a requirement has been submitted', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'SUBMITTED' })]
    renderPage()
    expect(screen.queryByRole('button', { name: /^edit$/i })).not.toBeInTheDocument()
  })

  it('shows Edit to a manager for any DRAFT requirement', () => {
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'DRAFT', requestedById: 2 })]
    renderPage()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
  })

  it('approves a requirement in store manager review', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'SUBMITTED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /store manager review/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /^approve$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/store-manager-review', { approve: true, remarks: '' })
  })

  it('rejects a requirement in store manager review', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'SUBMITTED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /store manager review/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /^reject$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/store-manager-review', { approve: false, remarks: '' })
  })

  it('keeps the store manager review modal open when the review fails', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_MANAGER'
    mocks.reqs = [makeReq({ status: 'SUBMITTED' })]
    mocks.apiPost.mockRejectedValue(new Error('Requirement is not in a reviewable state'))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /store manager review/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /^approve$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/store-manager-review', { approve: true, remarks: '' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('approves and assigns a vendor from manager review', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.vendors = [vendor]
    mocks.reqs = [makeReq({ status: 'PENDING_MANAGER_APPROVAL', items: [reqItem()] })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /manager review/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Cement')).toBeInTheDocument()
    await userEv.selectOptions(within(dialog).getByLabelText(/vendor/i), '1')
    fireEvent.change(within(dialog).getByLabelText(/expected delivery/i), { target: { value: '2026-09-05' } })
    await userEv.click(within(dialog).getByRole('button', { name: /approve & assign vendor/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/approve', {
      vendorId: 1,
      expectedDate: '2026-09-05',
      notes: undefined,
      items: [{ itemId: 1, orderedQty: 10 }],
    })
  })

  it('rejects a requirement from manager review', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'PENDING_MANAGER_APPROVAL' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^reject$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/reject this requirement/i)).toBeInTheDocument()
    await userEv.type(within(dialog).getByRole('textbox'), 'Not needed')
    await userEv.click(within(dialog).getByRole('button', { name: /reject requirement/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/reject', { approve: false, remarks: 'Not needed' })
  })

  it('marks a VENDOR_ASSIGNED requirement as awaiting delivery', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /awaiting delivery/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/mark-awaiting-delivery', {})
  })

  it('marks a WHATSAPP_SENT requirement as awaiting delivery', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'WHATSAPP_SENT' })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /awaiting delivery/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/mark-awaiting-delivery', {})
  })

  it('loads the WhatsApp message and marks it as sent', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    mocks.apiGet.mockResolvedValue({
      message: 'Order for Acme',
      waLink: 'https://wa.me/9876543210?text=x',
      mobile: '9876543210',
      vendor: 'Acme Supplies',
      poNumber: 'PO-0001',
      expectedDate: '2026-09-05',
    })
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Acme Supplies')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /open whatsapp/i })).toBeInTheDocument()
    await userEv.click(within(dialog).getByRole('button', { name: /mark as sent/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/mark-whatsapp-sent', {})
  })

  it('switches between WhatsApp message formats', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    mocks.apiGet.mockResolvedValue({
      message: 'Formal message',
      waLink: 'https://wa.me/9876543210?text=formal',
      mobile: '9876543210',
      vendor: 'Acme Supplies',
      poNumber: 'PO-0001',
      expectedDate: '2026-09-05',
      formats: [
        { id: 'formal', label: 'Formal', message: 'Formal message', waLink: 'https://wa.me/9876543210?text=formal' },
        { id: 'short', label: 'Short & Concise', message: 'Short message', waLink: 'https://wa.me/9876543210?text=short' },
        { id: 'friendly', label: 'Friendly', message: 'Friendly message', waLink: 'https://wa.me/9876543210?text=friendly' },
      ],
    })
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByText('Formal message')).toBeInTheDocument()
    expect(within(dialog).getByRole('link', { name: /open whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/9876543210?text=formal',
    )
    await userEv.click(within(dialog).getByRole('radio', { name: /short/i }))
    expect(within(dialog).getByRole('textbox')).toHaveValue('Short message')
    expect(within(dialog).getByRole('link', { name: /open whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/9876543210?text=short',
    )
    await userEv.click(within(dialog).getByRole('radio', { name: /friendly/i }))
    expect(within(dialog).getByRole('textbox')).toHaveValue('Friendly message')
  })

  it('copies the WhatsApp message', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    mocks.apiGet.mockResolvedValue({
      message: 'Hello Acme',
      waLink: null,
      mobile: null,
      vendor: 'Acme Supplies',
      poNumber: 'PO-0001',
      expectedDate: '2026-09-05',
    })
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    })
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(await within(dialog).findByRole('button', { name: /copy message/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Hello Acme')
    expect(within(dialog).getByRole('button', { name: 'Copied!' })).toBeInTheDocument()
    await act(async () => {
      await new Promise((r) => setTimeout(r, 2050))
    })
    expect(within(dialog).getByRole('button', { name: /copy message/i })).toBeInTheDocument()
  })

  it('shows an error when the WhatsApp message fails to load', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'MANAGER'
    mocks.reqs = [makeReq({ status: 'VENDOR_ASSIGNED' })]
    mocks.apiGet.mockRejectedValue(new Error('Failed to load'))
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /whatsapp/i }))
    expect(await screen.findByText('Failed to load')).toBeInTheDocument()
  })

  it('verifies received material as correct', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'MATERIAL_RECEIVED', items: [reqItem()] })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^verify$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Cement')).toBeInTheDocument()
    await userEv.click(within(dialog).getByRole('button', { name: /verified correct/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/verify', { approved: true })
  })

  it('reports a difference while verifying material', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.reqs = [makeReq({ status: 'VERIFICATION_PENDING', items: [reqItem()] })]
    mocks.apiPost.mockResolvedValue({})
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^verify$/i }))
    const dialog = screen.getByRole('dialog')
    await userEv.click(within(dialog).getByRole('button', { name: /found difference/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/requirements/1/verify', { approved: false })
  })

  it('opens the requirement detail from View', async () => {
    const userEv = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    mocks.stores = [store]
    mocks.users = [user]
    mocks.reqs = [makeReq({ status: 'COMPLETED', remarks: 'Need urgently', items: [reqItem()] })]
    renderPage()
    await userEv.click(screen.getByRole('button', { name: /^view$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('IPS Main Store')).toBeInTheDocument()
    expect(within(dialog).getByText('Ramesh')).toBeInTheDocument()
    expect(within(dialog).getByText('Need urgently')).toBeInTheDocument()
    expect(within(dialog).getByText('Cement')).toBeInTheDocument()
    expect(within(dialog).getByText('ITM-1')).toBeInTheDocument()
  })

  it('opens the requirement detail directly from a focus param', () => {
    mocks.role = 'STORE_KEEPER'
    mocks.stores = [store]
    mocks.users = [user]
    mocks.reqs = [makeReq({ status: 'COMPLETED', requirementNo: 'REQ-FOCUS' })]
    renderPage('/requirements?focus=1')
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/REQ-FOCUS/)).toBeInTheDocument()
  })
})
