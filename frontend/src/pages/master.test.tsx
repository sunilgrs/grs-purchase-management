import type { ReactNode } from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, waitFor, within, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VendorsPage, ItemsPage, UsersPage } from './master'

const renderAsync = async (el: ReactNode) => {
  await act(async () => {
    render(el)
  })
}

const apiMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

const mocks = vi.hoisted(() => ({
  role: 'ADMIN',
  data: {} as Record<string, unknown[]>,
}))

vi.mock('../lib/api', () => ({ api: apiMock }))
vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: mocks.data[path] ?? null,
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
vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 1, name: 'A', mobile: '9', email: null, role: mocks.role, status: 'ACTIVE' } }),
}))

describe('VendorsPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset()
    apiMock.post.mockReset()
    apiMock.patch.mockReset()
    apiMock.delete.mockReset()
    mocks.data = {
      '/vendors': [
        {
          id: 1,
          vendorName: 'Acme Supplies',
          contactPerson: 'Ravi',
          mobile: '9876543210',
          email: 'acme@example.com',
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('lists vendors with their details', async () => {
    await renderAsync(<VendorsPage />)
    expect(screen.getByText('Acme Supplies')).toBeInTheDocument()
    expect(screen.getByText('Ravi')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('creates a vendor from the form', async () => {
    apiMock.post.mockResolvedValue({})
    const user = userEvent.setup()
    await renderAsync(<VendorsPage />)
    await user.click(screen.getByRole('button', { name: /new/i }))
    await user.type(screen.getByLabelText(/vendor name/i), 'NewCo Traders')
    await user.click(screen.getByRole('button', { name: /save/i }))
    expect(apiMock.post).toHaveBeenCalledWith(
      '/vendors',
      expect.objectContaining({ vendorName: 'NewCo Traders', active: true }),
    )
  })

  it('deletes a vendor after confirmation', async () => {
    apiMock.delete.mockResolvedValue({})
    const user = userEvent.setup()
    await renderAsync(<VendorsPage />)
    await user.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByText(/delete this vendor/i)).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/vendors/1'))
  })

  it('shows dashes and inactive status for a vendor with missing fields', async () => {
    mocks.data = {
      '/vendors': [
        {
          id: 2,
          vendorName: 'Solo Vendor',
          contactPerson: null,
          mobile: null,
          email: null,
          active: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
    await renderAsync(<VendorsPage />)
    expect(screen.getByText('Solo Vendor')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3)
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})

describe('ItemsPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset()
    apiMock.post.mockReset()
    apiMock.get.mockImplementation((path: string) => {
      if (path === '/categories') return Promise.resolve([{ id: 1, name: 'Building Materials' }])
      if (path === '/vendors') return Promise.resolve([{ id: 1, vendorName: 'Acme Supplies' }])
      return Promise.resolve([])
    })
    mocks.data = {
      '/items': [
        {
          id: 1,
          itemCode: 'ITM-001',
          itemName: 'Cement',
          categoryId: 1,
          unit: 'bag',
          preferredVendorId: null,
          active: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
          Category: { id: 1, name: 'Building Materials' },
        },
      ],
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('lists items with their code and name', async () => {
    await renderAsync(<ItemsPage />)
    expect(screen.getByText('ITM-001')).toBeInTheDocument()
    expect(screen.getByText('Cement')).toBeInTheDocument()
    expect(screen.getByText('Building Materials')).toBeInTheDocument()
  })

  it('loads select options from option endpoints', async () => {
    const user = userEvent.setup()
    await renderAsync(<ItemsPage />)
    await user.click(screen.getByRole('button', { name: /new/i }))
    expect(await screen.findByRole('option', { name: 'Building Materials' })).toBeInTheDocument()
    expect(apiMock.get).toHaveBeenCalledWith('/categories')
    expect(apiMock.get).toHaveBeenCalledWith('/vendors')
  })

  it('creates an item with a category and preferred vendor', async () => {
    apiMock.post.mockResolvedValue({})
    const user = userEvent.setup()
    await renderAsync(<ItemsPage />)
    await user.click(screen.getByRole('button', { name: /new/i }))
    const dialog = screen.getByRole('dialog')
    expect(await within(dialog).findByRole('option', { name: 'Building Materials' })).toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/category/i), '1')
    await user.selectOptions(within(dialog).getByLabelText(/preferred vendor/i), '1')
    await user.type(within(dialog).getByLabelText(/item code/i), 'ITM-002')
    await user.type(within(dialog).getByLabelText(/item name/i), 'Steel')
    await user.type(within(dialog).getByLabelText(/unit/i), 'ton')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(apiMock.post).toHaveBeenCalledWith('/items', {
      itemCode: 'ITM-002',
      itemName: 'Steel',
      categoryId: 1,
      unit: 'ton',
      preferredVendorId: 1,
      active: true,
    })
  })

  it('edits an item using the update payload', async () => {
    apiMock.patch.mockResolvedValue({})
    const user = userEvent.setup()
    await renderAsync(<ItemsPage />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = screen.getByRole('dialog')
    const nameInput = within(dialog).getByLabelText(/item name/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Cement Pro')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(apiMock.patch).toHaveBeenCalledWith(
      '/items/1',
      expect.objectContaining({
        itemName: 'Cement Pro',
        categoryId: 1,
        unit: 'bag',
        preferredVendorId: undefined,
        active: true,
      }),
    )
  })

  it('deletes an item after confirmation using the custom message', async () => {
    apiMock.delete.mockResolvedValue({})
    const user = userEvent.setup()
    await renderAsync(<ItemsPage />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('Delete item "Cement"?')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/items/1'))
  })

  it('shows the import button for admins and managers', async () => {
    mocks.role = 'ADMIN'
    await renderAsync(<ItemsPage />)
    expect(screen.getByRole('button', { name: /import excel/i })).toBeInTheDocument()

    mocks.role = 'MANAGER'
    cleanup()
    await renderAsync(<ItemsPage />)
    expect(screen.getByRole('button', { name: /import excel/i })).toBeInTheDocument()
  })

  it('hides the import button for other roles', async () => {
    mocks.role = 'STORE_KEEPER'
    await renderAsync(<ItemsPage />)
    expect(screen.queryByRole('button', { name: /import excel/i })).not.toBeInTheDocument()

    mocks.role = 'PURCHASER'
    cleanup()
    await renderAsync(<ItemsPage />)
    expect(screen.queryByRole('button', { name: /import excel/i })).not.toBeInTheDocument()
  })

  it('shows dashes and inactive status for an item without a category', async () => {
    mocks.data = {
      '/items': [
        {
          id: 2,
          itemCode: 'ITM-002',
          itemName: 'Nails',
          categoryId: null,
          unit: 'kg',
          preferredVendorId: null,
          active: false,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
    await renderAsync(<ItemsPage />)
    expect(screen.getByText('Nails')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Inactive')).toBeInTheDocument()
  })
})

describe('UsersPage', () => {
  beforeEach(() => {
    apiMock.get.mockReset()
    apiMock.post.mockReset()
    apiMock.patch.mockReset()
    apiMock.delete.mockReset()
    mocks.data = {
      '/users': [
        {
          id: 1,
          name: 'Ramesh',
          mobile: '9876543210',
          email: 'ramesh@grs.example',
          role: 'STORE_KEEPER',
          status: 'ACTIVE',
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
      ],
    }
  })

  afterEach(() => {
    cleanup()
  })

  it('lets an admin manage users', async () => {
    mocks.role = 'ADMIN'
    await renderAsync(<UsersPage />)
    expect(screen.getByText('Manage staff accounts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('is read-only for non-admins', async () => {
    mocks.role = 'STORE_KEEPER'
    await renderAsync(<UsersPage />)
    expect(screen.getByText('Read-only list')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('renders user rows', async () => {
    mocks.role = 'ADMIN'
    await renderAsync(<UsersPage />)
    expect(screen.getByText('Ramesh')).toBeInTheDocument()
    expect(screen.getByText('STORE_KEEPER')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  })

  it('creates a user with a role and status', async () => {
    apiMock.post.mockResolvedValue({})
    const user = userEvent.setup()
    mocks.role = 'ADMIN'
    await renderAsync(<UsersPage />)
    await user.click(screen.getByRole('button', { name: /new/i }))
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText(/name/i), 'Priya')
    await user.type(within(dialog).getByLabelText(/mobile/i), '9123456789')
    await user.type(within(dialog).getByLabelText(/password/i), 'secret123')
    await user.selectOptions(within(dialog).getByLabelText(/role/i), 'PURCHASER')
    await user.selectOptions(within(dialog).getByLabelText(/status/i), 'ACTIVE')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(apiMock.post).toHaveBeenCalledWith('/users', {
      name: 'Priya',
      mobile: '9123456789',
      email: undefined,
      password: 'secret123',
      role: 'PURCHASER',
      status: 'ACTIVE',
    })
  })

  it('edits a user without the create-only password field', async () => {
    apiMock.patch.mockResolvedValue({})
    const user = userEvent.setup()
    mocks.role = 'ADMIN'
    await renderAsync(<UsersPage />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument()
    await user.selectOptions(within(dialog).getByLabelText(/role/i), 'MANAGER')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(apiMock.patch).toHaveBeenCalledWith(
      '/users/1',
      expect.objectContaining({
        name: 'Ramesh',
        mobile: '9876543210',
        email: 'ramesh@grs.example',
        role: 'MANAGER',
        status: 'ACTIVE',
      }),
    )
  })

  it('deletes a user after confirmation using the custom message', async () => {
    apiMock.delete.mockResolvedValue({})
    const user = userEvent.setup()
    mocks.role = 'ADMIN'
    await renderAsync(<UsersPage />)
    await user.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('Delete user "Ramesh"?')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(apiMock.delete).toHaveBeenCalledWith('/users/1'))
  })
})

