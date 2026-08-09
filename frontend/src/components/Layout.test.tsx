import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  user: null as { id: number; name: string; mobile: string; email: string | null; role: string; status: string } | null,
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
  }),
}))

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Layout />
    </MemoryRouter>,
  )

describe('Layout', () => {
  beforeEach(() => {
    mocks.logout.mockReset()
    mocks.user = { id: 1, name: 'Test User', mobile: '9999999999', email: null, role: 'ADMIN', status: 'ACTIVE' }
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the navigation sections and user info', () => {
    renderPage()
    expect(screen.getByText('IPS Purchase Manager')).toBeInTheDocument()
    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    for (const label of [
      'Dashboard',
      'Vendors',
      'Items',
      'Users',
      'Requirements',
      'Purchase Orders',
      'Deliveries',
      'Discrepancies',
      'Audit Logs',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('logs out and navigates to login', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTitle('Logout'))
    expect(mocks.logout).toHaveBeenCalled()
  })

  it('shows a fallback avatar when there is no user', () => {
    mocks.user = null
    renderPage()
    expect(screen.getByText('U')).toBeInTheDocument()
  })
})
