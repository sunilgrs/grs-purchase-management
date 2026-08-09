import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import AuditLogsPage from './AuditLogs'
import type { AuditLog } from '../types'

const mocks = vi.hoisted(() => ({
  logs: [] as AuditLog[],
  loading: false,
  error: null as string | null,
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => ({
    data: path === '/audit-logs' ? mocks.logs : [],
    loading: mocks.loading,
    error: mocks.error,
    reload: () => {},
  }),
}))

const makeLog = (over: Partial<AuditLog> = {}): AuditLog => ({
  id: 1,
  entityType: 'REQUIREMENT',
  entityId: 'REQ-0001',
  action: 'CREATED',
  description: 'Requirement created',
  performedById: 1,
  createdAt: '2026-08-01T00:00:00Z',
  User: { id: 1, name: 'Ramesh', mobile: '9999999999' },
  ...over,
})

describe('AuditLogsPage', () => {
  beforeEach(() => {
    mocks.logs = []
    mocks.loading = false
    mocks.error = null
  })

  afterEach(() => {
    cleanup()
  })

  it('shows the empty state', () => {
    render(<AuditLogsPage />)
    expect(screen.getByText(/no audit events yet/i)).toBeInTheDocument()
  })

  it('renders audit rows', () => {
    mocks.logs = [makeLog()]
    render(<AuditLogsPage />)
    expect(screen.getByText('REQ-0001')).toBeInTheDocument()
    expect(screen.getByText('REQUIREMENT')).toBeInTheDocument()
    expect(screen.getByText('CREATED')).toBeInTheDocument()
    expect(screen.getByText('Requirement created')).toBeInTheDocument()
    expect(screen.getByText('Ramesh')).toBeInTheDocument()
  })

  it('shows the spinner while loading', () => {
    mocks.loading = true
    render(<AuditLogsPage />)
    expect(document.querySelector('.animate-spin')).not.toBeNull()
  })

  it('shows errors from the API', () => {
    mocks.error = 'boom'
    render(<AuditLogsPage />)
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
