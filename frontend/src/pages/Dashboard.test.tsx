import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import type { DashboardSummary, DashboardAnalytics } from './Dashboard'

const mocks = vi.hoisted(() => ({
  user: {
    id: 1,
    name: 'Test User',
    mobile: '9999999999',
    email: null,
    role: 'MANAGER',
    status: 'ACTIVE',
    permissions: null,
  },
  data: null as DashboardSummary | null,
  analytics: null as DashboardAnalytics | null,
  loading: false,
  hasFeature: (_feature: string): boolean => true,
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: mocks.user, hasFeature: mocks.hasFeature }),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: path === '/dashboard/analytics' ? mocks.analytics : mocks.data,
    loading: mocks.loading,
    error: null,
    reload: () => {},
  }),
}))

const summary = (overrides: Partial<DashboardSummary> = {}): DashboardSummary => ({
  vendors: 0,
  items: 0,
  users: 0,
  requirements: 0,
  openRequirements: 0,
  purchaseOrders: 0,
  inProgressPos: 0,
  deliveries: 0,
  discrepancies: 0,
  openDiscrepancies: 0,
  recentPos: [],
  ...overrides,
})

const analytics = (overrides: Partial<DashboardAnalytics> = {}): DashboardAnalytics => ({
  spendTrend: [],
  poStatus: [],
  discrepancyTypes: [],
  priorityCounts: [],
  topVendors: [],
  topItems: [],
  ...overrides,
})

const renderPage = () => render(<MemoryRouter><Dashboard /></MemoryRouter>)

describe('Dashboard', () => {
  beforeEach(() => {
    mocks.loading = false
    mocks.data = summary()
    mocks.analytics = analytics()
    mocks.hasFeature = () => true
  })

  afterEach(() => {
    cleanup()
  })

  it('greets the logged-in user', () => {
    renderPage()
    expect(screen.getByText(/welcome back, test user/i)).toBeInTheDocument()
  })

  it('shows counts on the stat cards', () => {
    mocks.data = summary({
      vendors: 2,
      items: 3,
      users: 4,
      requirements: 3,
      purchaseOrders: 2,
      deliveries: 1,
      discrepancies: 2,
    })
    renderPage()

    expect(screen.getByRole('link', { name: /^2 Vendors/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^3 Items/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^4 Users/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^3 Requirements/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2 Purchase Orders/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^1 Deliveries/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2 Discrepancies/ })).toBeInTheDocument()
  })

  it('shows open counts for requirements, POs and discrepancies', () => {
    mocks.data = summary({
      requirements: 5,
      openRequirements: 3,
      purchaseOrders: 4,
      inProgressPos: 2,
      discrepancies: 3,
      openDiscrepancies: 1,
    })
    renderPage()

    const openReqs = screen.getByRole('link', { name: /open requirements/i })
    expect(within(openReqs).getByText('3')).toBeInTheDocument()

    const inProgress = screen.getByRole('link', { name: /pos in progress/i })
    expect(within(inProgress).getByText('2')).toBeInTheDocument()

    const openDisp = screen.getByRole('link', { name: /open discrepancies/i })
    expect(within(openDisp).getByText('1')).toBeInTheDocument()
  })

  it('renders cards without links when the user lacks the feature', () => {
    mocks.hasFeature = (feature: string) =>
      ['dashboard', 'requirements', 'deliveries', 'discrepancies'].includes(feature)
    mocks.data = summary({
      vendors: 2,
      items: 3,
      users: 4,
      requirements: 3,
      purchaseOrders: 2,
      deliveries: 1,
      discrepancies: 2,
    })
    renderPage()

    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getByText('Vendors')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^2 Vendors/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^3 Items/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^4 Users/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^2 Purchase Orders/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^3 Requirements/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^1 Deliveries/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^2 Discrepancies/ })).toBeInTheDocument()

    const inProgress = screen.getByText('POs In Progress')
    expect(inProgress.closest('a')).toBeNull()
  })

  it('lists recent purchase orders', () => {
    mocks.data = summary({
      recentPos: [
        {
          id: 2,
          poNumber: 'PO-1002',
          expectedDate: '2026-09-01T00:00:00Z',
          status: 'COMPLETED',
          Vendor: { vendorName: 'Acme Supplies' },
          Requirement: { requirementNo: 'REQ-2' },
        },
        {
          id: 1,
          poNumber: 'PO-1001',
          expectedDate: '2026-09-01T00:00:00Z',
          status: 'PENDING',
          Vendor: { vendorName: 'Beta Ltd' },
          Requirement: { requirementNo: 'REQ-1' },
        },
      ],
    })
    renderPage()
    expect(screen.getByText(/recent purchase orders/i)).toBeInTheDocument()
    expect(screen.getByText('PO-1001')).toBeInTheDocument()
    expect(screen.getByText('PO-1002')).toBeInTheDocument()
  })

  it('shows a placeholder when there are no purchase orders', () => {
    renderPage()
    expect(screen.getByText(/no purchase orders yet/i)).toBeInTheDocument()
  })

  it('shows the spinner while loading', () => {
    mocks.loading = true
    renderPage()
    expect(screen.queryByText(/recent purchase orders/i)).not.toBeInTheDocument()
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('renders the analytics section', () => {
    mocks.analytics = analytics({
      spendTrend: [{ month: 'Aug', spend: 2500 }],
      poStatus: [{ status: 'COMPLETED', count: 1 }],
    })
    renderPage()
    expect(screen.getByRole('heading', { name: /analytics/i })).toBeInTheDocument()
    expect(screen.getByText(/monthly spend/i)).toBeInTheDocument()
    expect(screen.getByText(/purchase order status/i)).toBeInTheDocument()
    expect(screen.getByText(/top vendors by spend/i)).toBeInTheDocument()
    expect(screen.getByText(/top items by spend/i)).toBeInTheDocument()
  })

  it('shows empty states when there is no analytics data', () => {
    renderPage()
    expect(screen.getByText(/no purchase spend yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no status data yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no discrepancies yet/i)).toBeInTheDocument()
  })

  it('lists top vendors and items from the analytics data', () => {
    mocks.analytics = analytics({
      topVendors: [{ vendorName: 'Acme Traders', spend: 12000 }],
      topItems: [{ itemName: 'Cement', spend: 8000 }],
    })
    renderPage()
    expect(screen.getByText('Acme Traders')).toBeInTheDocument()
    expect(screen.getByText('Cement')).toBeInTheDocument()
    expect(screen.getByText('₹12,000')).toBeInTheDocument()
    expect(screen.getByText('₹8,000')).toBeInTheDocument()
  })
})
