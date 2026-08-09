import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { Delivery, Discrepancy, Item, PurchaseOrder, Requirement, User, Vendor } from '../types'

const mocks = vi.hoisted(() => ({
  user: { id: 1, name: 'Test User', mobile: '9999999999', email: null, role: 'MANAGER', status: 'ACTIVE' },
  data: {} as Record<string, unknown>,
  loading: false,
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: mocks.user }),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: mocks.data[path] ?? null,
    loading: mocks.loading,
    error: null,
    reload: () => {},
  }),
}))

const requirement = (id: number, status: string): Requirement => ({
  id,
  requirementNo: `REQ-${id}`,
  storeId: 1,
  requestedById: 1,
  requiredDate: '2026-09-01T00:00:00Z',
  priority: 'NORMAL',
  status,
  approvedById: null,
  remarks: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  items: [],
  _count: { items: 0, PurchaseOrder: 0 },
})

const po = (id: number, status: string): PurchaseOrder => ({
  id,
  poNumber: `PO-${1000 + id}`,
  requirementId: 1,
  vendorId: 1,
  orderDate: '2026-08-01T00:00:00Z',
  expectedDate: '2026-09-01T00:00:00Z',
  status,
  notes: null,
  createdAt: '2026-08-01T00:00:00Z',
  updatedAt: '2026-08-01T00:00:00Z',
  Vendor: { id: 1, vendorName: 'Acme Supplies' },
  Requirement: { id: 1, requirementNo: 'REQ-1', status },
  items: [],
  _count: { items: 0, Delivery: 0 },
})

const renderPage = () => render(<MemoryRouter><Dashboard /></MemoryRouter>)

describe('Dashboard', () => {
  beforeEach(() => {
    mocks.loading = false
    mocks.data = {
      '/vendors': [] as Vendor[],
      '/items': [] as Item[],
      '/users': [] as User[],
      '/requirements': [] as Requirement[],
      '/purchase-orders': [] as PurchaseOrder[],
      '/deliveries': [] as Delivery[],
      '/discrepancies': [] as Discrepancy[],
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('greets the logged-in user', () => {
    renderPage()
    expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument()
  })

  it('shows counts on the stat cards', () => {
    mocks.data['/vendors'] = [{ id: 1 }, { id: 2 }] as unknown as Vendor[]
    mocks.data['/items'] = [{ id: 1 }, { id: 2 }, { id: 3 }] as unknown as Item[]
    mocks.data['/users'] = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }] as unknown as User[]
    mocks.data['/requirements'] = [requirement(1, 'COMPLETED'), requirement(2, 'REJECTED'), requirement(3, 'DRAFT')]
    mocks.data['/purchase-orders'] = [po(1, 'PENDING'), po(2, 'COMPLETED')]
    mocks.data['/deliveries'] = [{ id: 1 }] as unknown as Delivery[]
    mocks.data['/discrepancies'] = [{ id: 1 }, { id: 2 }] as unknown as Discrepancy[]
    renderPage()

    expect(screen.getByRole('link', { name: /^2 Vendors/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^3 Items/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^4 Users/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^3 Requirements/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2 Purchase Orders/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^1 Deliveries/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2 Discrepancies/ })).toBeInTheDocument()
  })

  it('counts only open requirements, POs and discrepancies', () => {
    mocks.data['/requirements'] = [
      requirement(1, 'COMPLETED'),
      requirement(2, 'REJECTED'),
      requirement(3, 'DRAFT'),
      requirement(4, 'SUBMITTED'),
      requirement(5, 'MATERIAL_RECEIVED'),
    ]
    mocks.data['/purchase-orders'] = [po(1, 'COMPLETED'), po(2, 'CANCELLED'), po(3, 'PENDING'), po(4, 'PARTIAL')]
    mocks.data['/discrepancies'] = [
      { id: 1, status: 'COMPLETED' },
      { id: 2, status: 'ISSUE_RAISED' },
      { id: 3, status: 'REJECTED' },
    ] as unknown as Discrepancy[]
    renderPage()

    const openReqs = screen.getByRole('link', { name: /open requirements/i })
    expect(within(openReqs).getByText('3')).toBeInTheDocument()

    const inProgress = screen.getByRole('link', { name: /pos in progress/i })
    expect(within(inProgress).getByText('2')).toBeInTheDocument()

    const openDisp = screen.getByRole('link', { name: /open discrepancies/i })
    expect(within(openDisp).getByText('1')).toBeInTheDocument()
  })

  it('lists recent purchase orders', () => {
    mocks.data['/purchase-orders'] = [po(2, 'COMPLETED'), po(1, 'PENDING')]
    renderPage()
    expect(screen.getByText(/recent purchase orders/i)).toBeInTheDocument()
    expect(screen.getByText('PO-1001')).toBeInTheDocument()
    expect(screen.getByText('PO-1002')).toBeInTheDocument()
  })

  it('shows the spinner while loading', () => {
    mocks.loading = true
    renderPage()
    expect(screen.queryByText(/recent purchase orders/i)).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })
})
