import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RegisterPage from './Register'

const mocks = vi.hoisted(() => ({ register: vi.fn() }))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: vi.fn(),
    register: mocks.register,
    logout: vi.fn(),
  }),
}))

const renderRegister = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<div>HOME</div>} />
      </Routes>
    </MemoryRouter>,
  )

const fillForm = async ({
  password = 'secret1',
  confirm = 'secret1',
  name = 'Ravi Kumar',
  mobile = '9876543210',
}: { password?: string; confirm?: string; name?: string; mobile?: string } = {}) => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^full name/i), name)
  await user.type(screen.getByLabelText(/^mobile/i), mobile)
  await user.type(screen.getByLabelText(/^password/i), password)
  await user.type(screen.getByLabelText(/^confirm password/i), confirm)
  await user.click(screen.getByRole('button', { name: /create account/i }))
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('registers the user and navigates home on success', async () => {
    mocks.register.mockResolvedValue(undefined)
    renderRegister()
    await fillForm()
    expect(mocks.register).toHaveBeenCalledWith({
      name: 'Ravi Kumar',
      mobile: '9876543210',
      email: undefined,
      role: 'STORE_KEEPER',
      password: 'secret1',
    })
    expect(await screen.findByText('HOME')).toBeInTheDocument()
  })

  it('rejects passwords shorter than 6 characters', async () => {
    renderRegister()
    await fillForm({ password: '123', confirm: '123' })
    expect(await screen.findByText(/password must be at least 6 characters/i)).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('rejects mismatched passwords', async () => {
    renderRegister()
    await fillForm({ password: 'secret1', confirm: 'secret2' })
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('shows an error when registration fails', async () => {
    mocks.register.mockRejectedValue(new Error('Mobile already in use'))
    renderRegister()
    await fillForm()
    expect(await screen.findByText('Mobile already in use')).toBeInTheDocument()
    expect(screen.queryByText('HOME')).not.toBeInTheDocument()
  })
})
