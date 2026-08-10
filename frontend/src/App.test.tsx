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
vi.mock('./pages/Settings', () => ({ default: () => <div>SETTINGS</div> }))
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
    permissions: null,
  })

const authedWith = (user: Record<string, unknown>) => setSession('tok', user)

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

  it('redirects a user without a feature to their first allowed tab', async () => {
    authedWith({
      id: 2,
      name: 'Restricted',
      mobile: '9999999998',
      email: null,
      role: 'MANAGER',
      status: 'ACTIVE',
      permissions: ['items'],
    })
    renderAt('/requirements')
    expect(await screen.findByText('ITEMS')).toBeInTheDocument()
  })

  it('redirects a user without dashboard access away from /', async () => {
    authedWith({
      id: 2,
      name: 'Restricted',
      mobile: '9999999998',
      email: null,
      role: 'MANAGER',
      status: 'ACTIVE',
      permissions: ['vendors'],
    })
    renderAt('/')
    expect(await screen.findByText('VENDORS')).toBeInTheDocument()
  })

  it('allows an admin to open the settings page', async () => {
    authedWith({
      id: 1,
      name: 'Admin',
      mobile: '9999999999',
      email: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      permissions: null,
    })
    renderAt('/settings')
    expect(await screen.findByText('SETTINGS')).toBeInTheDocument()
  })

  it('redirects non-admins away from settings', async () => {
    authed()
    renderAt('/settings')
    expect(await screen.findByText('DASHBOARD')).toBeInTheDocument()
  })
})
