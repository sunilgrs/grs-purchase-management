import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import App from './App'
import { setSession } from './lib/api'

vi.mock('./pages/Dashboard', () => ({ default: () => <div>DASHBOARD</div> }))
vi.mock('./pages/Requirements', () => ({ default: () => <div>REQUIREMENTS</div> }))
vi.mock('./pages/Login', () => ({ default: () => <div>LOGIN</div> }))
vi.mock('./pages/Register', () => ({ default: () => <div>REGISTER</div> }))
vi.mock('./pages/AuditLogs', () => ({ default: () => <div>AUDITLOGS</div> }))
vi.mock('./pages/Deliveries', () => ({ default: () => <div>DELIVERIES</div> }))
vi.mock('./pages/Discrepancies', () => ({ default: () => <div>DISCREPANCIES</div> }))
vi.mock('./pages/PurchaseOrders', () => ({ default: () => <div>PURCHASEORDERS</div> }))
vi.mock('./pages/master', () => ({
  ItemsPage: () => <div>ITEMS</div>,
  UsersPage: () => <div>USERS</div>,
  VendorsPage: () => <div>VENDORS</div>,
}))

const goTo = (path: string) => window.history.pushState({}, '', path)

const renderAt = (path: string) => {
  goTo(path)
  render(<App />)
}

const authed = () =>
  setSession('tok', {
    id: 1,
    name: 'Test User',
    mobile: '9999999999',
    email: null,
    role: 'MANAGER',
    status: 'ACTIVE',
  })

describe('App routing', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
  })

  it('redirects unauthenticated users to login', async () => {
    renderAt('/')
    expect(await screen.findByText('LOGIN')).toBeInTheDocument()
  })

  it('redirects protected routes to login when unauthenticated', async () => {
    renderAt('/requirements')
    expect(await screen.findByText('LOGIN')).toBeInTheDocument()
  })

  it('shows the dashboard to an authenticated user', async () => {
    authed()
    renderAt('/')
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
  })

  it('renders the page for a protected route when authenticated', async () => {
    authed()
    renderAt('/requirements')
    expect(await screen.findByText('REQUIREMENTS')).toBeInTheDocument()
  })

  it('sends authenticated users away from /login', async () => {
    authed()
    renderAt('/login')
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
  })

  it('redirects unknown paths to the dashboard', async () => {
    authed()
    renderAt('/no-such-page')
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
  })
})
