import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import LoginPage from './Login'

const mocks = vi.hoisted(() => ({ login: vi.fn() }))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({
    user: null,
    token: null,
    loading: false,
    login: mocks.login,
    register: vi.fn(),
    logout: vi.fn(),
  }),
}))

const renderLogin = (fromPath?: string) =>
  render(
    <MemoryRouter
      initialEntries={[
        fromPath
          ? { pathname: '/login', state: { from: { pathname: fromPath } } }
          : '/login',
      ]}
    >
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/requirements" element={<div>REQUIREMENTS</div>} />
      </Routes>
    </MemoryRouter>,
  )

const fillAndSubmit = async () => {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText(/^username/i), 'admin')
  await user.type(screen.getByLabelText(/^password/i), 'secret')
  await user.click(screen.getByRole('button', { name: /sign in/i }))
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the username and password fields', () => {
    renderLogin()
    expect(screen.getByLabelText(/^username/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument()
  })

  it('calls login and navigates home on success', async () => {
    mocks.login.mockResolvedValue(undefined)
    renderLogin()
    await fillAndSubmit()
    expect(mocks.login).toHaveBeenCalledWith('admin', 'secret')
    expect(await screen.findByText('HOME')).toBeInTheDocument()
  })

  it('shows an error when login fails', async () => {
    mocks.login.mockRejectedValue(new Error('Invalid credentials'))
    renderLogin()
    await fillAndSubmit()
    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(screen.queryByText('HOME')).not.toBeInTheDocument()
  })

  it('navigates to the originally requested page after login', async () => {
    mocks.login.mockResolvedValue(undefined)
    renderLogin('/requirements')
    await fillAndSubmit()
    expect(await screen.findByText('REQUIREMENTS')).toBeInTheDocument()
  })
})
