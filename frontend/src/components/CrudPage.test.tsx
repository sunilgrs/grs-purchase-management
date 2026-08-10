import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, within, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CrudPage, type CrudConfig } from './CrudPage'

const mocks = vi.hoisted(() => ({
  data: null as unknown[] | null,
  loading: false,
  error: null as string | null,
  reload: vi.fn(),
  submitting: false,
  actionError: null as string | null,
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('../lib/api', () => ({
  api: { get: mocks.apiGet, post: mocks.apiPost, patch: mocks.apiPatch, delete: mocks.apiDelete },
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: () => ({
    data: mocks.data,
    loading: mocks.loading,
    error: mocks.error,
    reload: mocks.reload,
  }),
  useApiAction: () => ({
    submitting: mocks.submitting,
    error: mocks.actionError,
    clearError: () => {},
    run: async <T,>(fn: () => Promise<T>) => fn(),
  }),
}))

const config: CrudConfig<{ id: number; name: string; categoryId: number; address: string; active: boolean }> = {
  title: 'Vendors',
  endpoint: '/vendors',
  canDelete: true,
  deleteMessage: (r) => `Deactivate vendor ${r.name}?`,
  columns: [
    { header: 'Name', render: (r) => <span>{r.name}</span> },
    { header: 'Address', render: (r) => r.address || '—' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'categoryId', label: 'Category', type: 'select', optionsEndpoint: '/categories' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'active', label: 'Active', type: 'checkbox', default: true },
    { name: 'password', label: 'Password', type: 'password', createOnly: true, required: true },
  ],
  extraActions: (r) => <button onClick={() => {}}>Star {r.id}</button>,
  createPayload: (v) => ({
    name: v.name,
    categoryId: v.categoryId ? Number(v.categoryId) : undefined,
    address: v.address || undefined,
    active: Boolean(v.active),
    password: v.password,
  }),
  updatePayload: (v) => ({
    name: v.name,
    categoryId: v.categoryId ? Number(v.categoryId) : undefined,
    address: v.address || undefined,
    active: Boolean(v.active),
  }),
}

const row = { id: 1, name: 'Acme', categoryId: 1, address: 'Pune', active: true }

const renderAsync = async (el: React.ReactNode) => {
  await act(async () => {
    render(el)
  })
}

describe('CrudPage', () => {
  beforeEach(() => {
    mocks.data = [row]
    mocks.loading = false
    mocks.error = null
    mocks.submitting = false
    mocks.actionError = null
    mocks.reload.mockReset()
    mocks.apiGet.mockReset()
    mocks.apiPost.mockReset()
    mocks.apiPatch.mockReset()
    mocks.apiDelete.mockReset()
    mocks.apiGet.mockResolvedValue([{ id: 1, name: 'Building Materials' }])
  })

  afterEach(() => {
    cleanup()
  })

  it('shows a loading spinner while fetching', async () => {
    mocks.loading = true
    mocks.data = null
    await renderAsync(<CrudPage config={config} />)
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows an error with a retry button', async () => {
    mocks.error = 'Failed to load'
    mocks.data = null
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /retry/i }))
    expect(mocks.reload).toHaveBeenCalled()
  })

  it('shows an empty state when there are no rows', async () => {
    mocks.data = []
    await renderAsync(<CrudPage config={config} />)
    expect(screen.getByText(/no vendors yet/i)).toBeInTheDocument()
  })

  it('renders rows with columns and extra actions', async () => {
    await renderAsync(<CrudPage config={config} />)
    expect(screen.getByText('Acme')).toBeInTheDocument()
    expect(screen.getByText('Pune')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /star 1/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^edit$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^deactivate$/i })).toBeInTheDocument()
  })

  it('creates a record from the form', async () => {
    const user = userEvent.setup()
    mocks.apiPost.mockResolvedValue({})
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    const dialog = screen.getByRole('dialog')
    await user.selectOptions(within(dialog).getByLabelText(/category/i), '1')
    await user.type(within(dialog).getByLabelText(/name/i), 'Acme')
    await user.type(within(dialog).getByLabelText(/address/i), 'Pune')
    await user.type(within(dialog).getByLabelText(/password/i), 'secret123')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/vendors', {
      name: 'Acme',
      categoryId: 1,
      address: 'Pune',
      active: true,
      password: 'secret123',
    })
  })

  it('hides create-only fields when editing and sends a patch', async () => {
    const user = userEvent.setup()
    mocks.apiPatch.mockResolvedValue({})
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^edit$/i }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByLabelText(/password/i)).not.toBeInTheDocument()
    await user.clear(within(dialog).getByLabelText(/name/i))
    await user.type(within(dialog).getByLabelText(/name/i), 'Acme 2')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(mocks.apiPatch).toHaveBeenCalledWith('/vendors/1', expect.objectContaining({ name: 'Acme 2', active: true }))
  })

  it('deactivates a record after confirmation using the custom message', async () => {
    const user = userEvent.setup()
    mocks.apiDelete.mockResolvedValue({})
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }))
    expect(screen.getByText('Deactivate vendor Acme?')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^deactivate$/i }))
    await waitFor(() => expect(mocks.apiDelete).toHaveBeenCalledWith('/vendors/1'))
  })

  it('falls back to the default deactivate message without deleteMessage', async () => {
    const user = userEvent.setup()
    mocks.apiDelete.mockResolvedValue({})
    const noMessage = { ...config, deleteMessage: undefined }
    await renderAsync(<CrudPage config={noMessage} />)
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }))
    expect(screen.getByText(/deactivate this vendor/i)).toBeInTheDocument()
  })

  it('cancels the form without submitting', async () => {
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes the create modal from the close button', async () => {
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getAllByRole('button')[0])
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('toggles the active checkbox when creating', async () => {
    const user = userEvent.setup()
    mocks.apiPost.mockResolvedValue({})
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    const dialog = screen.getByRole('dialog')
    await user.click(within(dialog).getByRole('checkbox', { name: /active/i }))
    await user.type(within(dialog).getByLabelText(/name/i), 'Acme')
    await user.type(within(dialog).getByLabelText(/password/i), 'secret123')
    await user.click(within(dialog).getByRole('button', { name: /^save$/i }))
    expect(mocks.apiPost).toHaveBeenCalledWith('/vendors', expect.objectContaining({ active: false }))
  })

  it('cancels a deactivation from the confirm dialog', async () => {
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^deactivate$/i }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^cancel$/i }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.apiDelete).not.toHaveBeenCalled()
  })

  it('shows the saving state while submitting', async () => {
    mocks.submitting = true
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled()
  })

  it('shows action errors in the form', async () => {
    mocks.actionError = 'Network down'
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^new$/i }))
    expect(within(screen.getByRole('dialog')).getByText('Network down')).toBeInTheDocument()
  })

  it('reloads on mount when refreshKey is set', async () => {
    await renderAsync(<CrudPage config={config} refreshKey={1} />)
    expect(mocks.reload).toHaveBeenCalled()
  })

  it('shows all rows by default', async () => {
    mocks.data = [
      { id: 1, name: 'Active Co', categoryId: 1, address: '', active: true },
      { id: 2, name: 'Inactive Co', categoryId: 1, address: '', active: false },
    ]
    await renderAsync(<CrudPage config={config} />)
    expect(screen.getByText('Active Co')).toBeInTheDocument()
    expect(screen.getByText('Inactive Co')).toBeInTheDocument()
  })

  it('filters to active rows only', async () => {
    mocks.data = [
      { id: 1, name: 'Active Co', categoryId: 1, address: '', active: true },
      { id: 2, name: 'Inactive Co', categoryId: 1, address: '', active: false },
    ]
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^active$/i }))
    expect(screen.getByText('Active Co')).toBeInTheDocument()
    expect(screen.queryByText('Inactive Co')).not.toBeInTheDocument()
  })

  it('filters to inactive rows only', async () => {
    mocks.data = [
      { id: 1, name: 'Active Co', categoryId: 1, address: '', active: true },
      { id: 2, name: 'Inactive Co', categoryId: 1, address: '', active: false },
    ]
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^inactive$/i }))
    expect(screen.getByText('Inactive Co')).toBeInTheDocument()
    expect(screen.queryByText('Active Co')).not.toBeInTheDocument()
  })

  it('uses the isActive callback for status-based records', async () => {
    const userConfig = {
      ...config,
      isActive: (r: { id: number; name: string; categoryId: number; address: string; active: boolean }) =>
        (r as unknown as { status: string }).status === 'ACTIVE',
    }
    mocks.data = [
      { id: 1, name: 'On Staff', categoryId: 1, address: '', status: 'ACTIVE' },
      { id: 2, name: 'Off Staff', categoryId: 1, address: '', status: 'INACTIVE' },
    ] as unknown as typeof mocks.data
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={userConfig} />)
    expect(screen.getByText('On Staff')).toBeInTheDocument()
    expect(screen.getByText('Off Staff')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^inactive$/i }))
    expect(screen.getByText('Off Staff')).toBeInTheDocument()
    expect(screen.queryByText('On Staff')).not.toBeInTheDocument()
  })

  it('shows a filtered empty state when no rows match', async () => {
    mocks.data = [{ id: 1, name: 'Active Co', categoryId: 1, address: '', active: false }]
    const user = userEvent.setup()
    await renderAsync(<CrudPage config={config} />)
    await user.click(screen.getByRole('button', { name: /^active$/i }))
    expect(screen.getByText(/no active vendors/i)).toBeInTheDocument()
  })
})
