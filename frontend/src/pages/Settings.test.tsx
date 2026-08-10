import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import SettingsPage from './Settings'
import type { User } from '../types'

const mocks = vi.hoisted(() => ({
  users: [] as User[],
  patch: vi.fn(),
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: () => ({
    data: mocks.users,
    loading: false,
    error: null,
    reload: vi.fn(),
  }),
}))

vi.mock('../lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: mocks.patch, delete: vi.fn() },
}))

const user = (id: number, overrides: Partial<User> = {}): User => ({
  id,
  name: `User ${id}`,
  mobile: `9000000${id}`,
  email: null,
  role: 'MANAGER',
  status: 'ACTIVE',
  permissions: null,
  createdAt: '',
  updatedAt: '',
  ...overrides,
})

const renderPage = () => render(<SettingsPage />)

describe('Settings page', () => {
  beforeEach(() => {
    mocks.patch.mockReset().mockResolvedValue({})
    mocks.users = [
      user(1),
      user(2, { role: 'STORE_KEEPER', permissions: ['requirements'] }),
    ]
  })

  afterEach(() => {
    cleanup()
  })

  it('lists users with their roles', () => {
    renderPage()
    expect(screen.getByText('User 1')).toBeInTheDocument()
    expect(screen.getByText('User 2')).toBeInTheDocument()
    expect(screen.getByText('STORE_KEEPER')).toBeInTheDocument()
  })

  it('marks users with null permissions as having all tabs', () => {
    renderPage()
    expect(screen.getAllByText('All tabs allowed (role default)')).toHaveLength(1)
  })

  it('shows checked checkboxes for granted features', () => {
    renderPage()
    const row = screen.getByText('User 2').closest('tr') as HTMLElement
    const withinRow = within(row)
    expect(withinRow.getByRole('checkbox', { name: 'Requirements' })).toBeChecked()
    expect(withinRow.getByRole('checkbox', { name: 'Items' })).not.toBeChecked()
  })

  it('saves the selected features for a user', async () => {
    const userEventApi = userEvent.setup()
    renderPage()
    const row = screen.getByText('User 2').closest('tr') as HTMLElement
    const withinRow = within(row)
    await userEventApi.click(withinRow.getByRole('checkbox', { name: 'Items' }))
    await userEventApi.click(withinRow.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/users/2/permissions', {
        permissions: ['requirements', 'items'],
      })
    })
    expect(withinRow.getByText('Saved')).toBeInTheDocument()
  })

  it('resets a restricted user back to the role defaults', async () => {
    const userEventApi = userEvent.setup()
    renderPage()
    const row = screen.getByText('User 2').closest('tr') as HTMLElement
    const withinRow = within(row)
    await userEventApi.click(withinRow.getByRole('button', { name: 'Reset to default' }))

    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/users/2/permissions', {
        permissions: null,
      })
    })
  })

  it('reports save errors', async () => {
    const userEventApi = userEvent.setup()
    mocks.patch.mockRejectedValue(new Error('Not permitted'))
    renderPage()
    const row = screen.getByText('User 1').closest('tr') as HTMLElement
    const withinRow = within(row)
    await userEventApi.click(withinRow.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Not permitted')).toBeInTheDocument()
  })
})
