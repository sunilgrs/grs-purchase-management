import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Layout from './Layout'

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  hasFeature: vi.fn<(feature: string) => boolean>(() => true),
  user: null as {
    id: number
    name: string
    mobile: string
    email: string | null
    role: string
    status: string
    permissions: string[] | null
  } | null,
}))

const apiMock = vi.hoisted(() => ({
  patch: vi.fn(),
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
    hasFeature: mocks.hasFeature,
    isAdmin: mocks.user?.role === 'ADMIN',
  }),
}))

vi.mock('../lib/api', () => ({ api: apiMock }))

vi.mock('../hooks/useFetch', () => ({
  useFetch: () => ({ data: null, loading: false, error: null, reload: () => {} }),
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
    mocks.hasFeature.mockImplementation(() => true)
    apiMock.patch.mockReset()
    mocks.user = {
      id: 1,
      name: 'Test User',
      mobile: '9999999999',
      email: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: null,
    }
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
      'Settings',
    ]) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('hides the Settings tab for non-admins', () => {
    mocks.user = { ...mocks.user!, role: 'MANAGER' }
    renderPage()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('hides tabs that are not granted to the user', () => {
    mocks.hasFeature.mockImplementation((feature: string) =>
      ['dashboard', 'requirements'].includes(feature),
    )
    renderPage()
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Requirements' })).toBeInTheDocument()
    for (const label of ['Vendors', 'Items', 'Users', 'Purchase Orders', 'Deliveries', 'Discrepancies', 'Audit Logs']) {
      expect(screen.queryByRole('link', { name: label })).not.toBeInTheDocument()
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

  it('changes the password from the dialog', async () => {
    apiMock.patch.mockResolvedValue({})
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTitle('Change password'))
    await user.type(screen.getByLabelText(/current password/i), 'oldpass1')
    await user.type(screen.getByLabelText(/^new password/i), 'newpass1')
    await user.type(screen.getByLabelText(/confirm new password/i), 'newpass1')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^change password$/i }))
    expect(apiMock.patch).toHaveBeenCalledWith('/auth/password', {
      currentPassword: 'oldpass1',
      newPassword: 'newpass1',
    })
    await waitFor(() =>
      expect(screen.getByText(/your password has been changed/i)).toBeInTheDocument(),
    )
  })

  it('rejects a change password form when passwords do not match', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByTitle('Change password'))
    await user.type(screen.getByLabelText(/current password/i), 'oldpass1')
    await user.type(screen.getByLabelText(/^new password/i), 'newpass1')
    await user.type(screen.getByLabelText(/confirm new password/i), 'different')
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('button', { name: /^change password$/i }))
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(apiMock.patch).not.toHaveBeenCalled()
  })
})
