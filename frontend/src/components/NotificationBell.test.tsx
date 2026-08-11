import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NotificationBell from './NotificationBell'
import type { NotificationsPayload } from './NotificationBell'

const mocks = vi.hoisted(() => ({
  data: null as NotificationsPayload | null,
  loading: false,
  navigate: vi.fn(),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: () => ({
    data: mocks.data,
    loading: mocks.loading,
    error: null,
    reload: () => {},
  }),
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: () => mocks.navigate }
})

const payload = (overrides: Partial<NotificationsPayload> = {}): NotificationsPayload => ({
  approvals: [
    {
      id: 1,
      requirementNo: 'REQ-1',
      priority: 'HIGH',
      createdAt: '2026-08-11T09:00:00Z',
      requestedBy: { name: 'Ramesh' },
    },
  ],
  deliveries: [
    {
      id: 2,
      poNumber: 'PO-2',
      expectedDate: '2026-08-20T00:00:00Z',
      status: 'PARTIAL',
      createdAt: '2026-08-10T09:00:00Z',
      Vendor: { vendorName: 'Acme Traders' },
    },
  ],
  discrepancies: [
    {
      id: 3,
      discrepancyType: 'DAMAGE',
      status: 'ISSUE_RAISED',
      createdAt: '2026-08-09T09:00:00Z',
      Item: { itemName: 'Safety Gloves' },
      PurchaseOrder: { poNumber: 'PO-1' },
    },
  ],
  ...overrides,
})

const renderBell = (placement: 'down' | 'up' = 'down') => render(<NotificationBell placement={placement} />)

describe('NotificationBell', () => {
  beforeEach(() => {
    localStorage.clear()
    mocks.data = null
    mocks.loading = false
    mocks.navigate.mockReset()
  })

  afterEach(() => {
    cleanup()
  })

  it('shows an empty state when there are no notifications', async () => {
    mocks.data = { approvals: [], deliveries: [], discrepancies: [] }
    const user = userEvent.setup()
    renderBell()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
  })

  it('shows the unread badge and group headings', async () => {
    mocks.data = payload()
    const user = userEvent.setup()
    renderBell()
    expect(screen.getByText('3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.getByText(/pending approvals/i)).toBeInTheDocument()
    expect(screen.getByText(/pos awaiting delivery/i)).toBeInTheDocument()
    expect(screen.getByText(/open discrepancies/i)).toBeInTheDocument()
    expect(screen.getByText('REQ-1')).toBeInTheDocument()
    expect(screen.getByText('PO-2')).toBeInTheDocument()
    expect(screen.getByText(/damage · safety gloves/i)).toBeInTheDocument()
  })

  it('navigates and marks notifications read when an item is clicked', async () => {
    mocks.data = payload()
    const user = userEvent.setup()
    renderBell()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(screen.getByText('REQ-1'))
    expect(mocks.navigate).toHaveBeenCalledWith('/requirements')
    expect(localStorage.getItem('grs_notif_read')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('marks all notifications read from the dropdown', async () => {
    mocks.data = payload()
    const user = userEvent.setup()
    renderBell()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    await user.click(screen.getByRole('button', { name: /mark all read/i }))
    expect(localStorage.getItem('grs_notif_read')).not.toBeNull()
    await user.click(screen.getByRole('button', { name: /notifications/i }))
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })

  it('does not show a badge when everything has been read', () => {
    localStorage.setItem('grs_notif_read', '9999-12-31T00:00:00Z')
    mocks.data = payload()
    renderBell()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })
})
