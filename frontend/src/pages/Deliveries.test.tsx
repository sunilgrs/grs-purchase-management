import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DeliveriesPage from './Deliveries'
import type { Delivery } from '../types'

const mocks = vi.hoisted(() => ({
  dels: [] as Delivery[],
  role: 'STORE_KEEPER',
  navigate: vi.fn(),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 1, name: 'Test User', mobile: '9999999999', email: null, role: mocks.role, status: 'ACTIVE' },
  }),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: path === '/deliveries' ? mocks.dels : [],
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

const makeDelivery = (over: Partial<Delivery>): Delivery => ({
  id: 1,
  poId: 1,
  deliveryDate: '2026-08-05T00:00:00Z',
  receivedById: 1,
  status: 'FULL',
  remarks: null,
  createdAt: '2026-08-05T00:00:00Z',
  User: { id: 1, name: 'Ramesh' },
  PurchaseOrder: { id: 1, poNumber: 'PO-0001', status: 'COMPLETED' },
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
  _count: { items: 1, Discrepancy: 0 },
  ...over,
})

const renderPage = () => render(<DeliveriesPage />)

describe('DeliveriesPage', () => {
  beforeEach(() => {
    mocks.dels = []
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the page header', () => {
    renderPage()
    expect(screen.getByRole('heading', { name: /deliveries/i })).toBeInTheDocument()
  })

  it('shows the empty state when there are no deliveries', () => {
    renderPage()
    expect(screen.getByText(/no deliveries yet/i)).toBeInTheDocument()
  })

  it('renders delivery rows with PO number and status', () => {
    mocks.dels = [makeDelivery({})]
    renderPage()
    expect(screen.getByText('PO-0001')).toBeInTheDocument()
    expect(screen.getByText('FULL')).toBeInTheDocument()
    expect(screen.getByText('Ramesh')).toBeInTheDocument()
  })

  it('shows zero issues when no discrepancies are linked', () => {
    mocks.dels = [makeDelivery({})]
    renderPage()
    expect(screen.getByRole('columnheader', { name: /issues/i })).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows the discrepancy count as a badge when issues exist', () => {
    mocks.dels = [makeDelivery({ _count: { items: 1, Discrepancy: 2 } })]
    renderPage()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('opens the detail modal from View', async () => {
    const user = userEvent.setup()
    mocks.dels = [makeDelivery({})]
    renderPage()
    await user.click(screen.getByRole('button', { name: /view/i }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByText('Cement')).toBeInTheDocument()
    expect(within(dialog).getByText('GOOD')).toBeInTheDocument()
  })

  it('shows dashes for a delivery without related records', () => {
    mocks.dels = [makeDelivery({ PurchaseOrder: null, User: null })]
    renderPage()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(2)
  })

  it('opens the detail modal for a delivery without a PO number', async () => {
    const user = userEvent.setup()
    mocks.dels = [makeDelivery({ PurchaseOrder: null, User: null, items: [] })]
    renderPage()
    await user.click(screen.getByRole('button', { name: /view/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText(/^delivery —/i)).toBeInTheDocument()
    expect(within(dialog).getByText('—')).toBeInTheDocument()
  })

  it('shows Record Delivery to store keepers and store managers', () => {
    mocks.role = 'STORE_KEEPER'
    renderPage()
    expect(screen.getByRole('button', { name: /record delivery/i })).toBeInTheDocument()

    mocks.role = 'STORE_MANAGER'
    cleanup()
    renderPage()
    expect(screen.getByRole('button', { name: /record delivery/i })).toBeInTheDocument()
  })

  it('opens the record delivery modal from Record Delivery', async () => {
    const user = userEvent.setup()
    mocks.role = 'STORE_KEEPER'
    renderPage()
    await user.click(screen.getByRole('button', { name: /record delivery/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Record Delivery')).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/purchase order/i)).toBeInTheDocument()
  })

  it('navigates to discrepancies prefilled from Report Issue', async () => {
    const user = userEvent.setup()
    mocks.dels = [makeDelivery({})]
    renderPage()
    await user.click(screen.getByRole('button', { name: /report issue/i }))
    expect(mocks.navigate).toHaveBeenCalledWith('/discrepancies?poId=1&deliveryId=1')
  })
})
