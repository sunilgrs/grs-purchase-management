import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import ReportsPage, { type SpendReport } from './Reports'
import { downloadCSV } from '../lib/csv'

const mocks = vi.hoisted(() => ({
  data: null as SpendReport | null,
  loading: false,
  error: null as string | null,
  path: '',
}))

vi.mock('../hooks/useFetch', () => ({
  useFetch: (path: string) => {
    mocks.path = path
    return {
      data: mocks.data,
      loading: mocks.loading,
      error: mocks.error,
      reload: () => {},
    }
  },
}))

vi.mock('../lib/csv', () => ({
  downloadCSV: vi.fn(),
}))

const sampleReport: SpendReport = {
  groupBy: 'vendor',
  from: '2025-08-11',
  to: '2026-08-11',
  count: 3,
  total: 12500,
  rows: [
    { label: 'Acme Supplies', count: 2, spend: 10000 },
    { label: 'Bolt Ltd', count: 1, spend: 2500 },
  ],
}

describe('ReportsPage', () => {
  beforeEach(() => {
    mocks.data = null
    mocks.loading = false
    mocks.error = null
    mocks.path = ''
    vi.mocked(downloadCSV).mockClear()
  })

  afterEach(() => {
    cleanup()
  })

  it('requests the report with the current filters', () => {
    render(<ReportsPage />)
    expect(mocks.path).toContain('/reports/spend?groupBy=month')
    expect(mocks.path).toContain('from=')
    expect(mocks.path).toContain('to=')
  })

  it('renders grouped rows with a total', () => {
    mocks.data = sampleReport
    render(<ReportsPage />)
    expect(screen.getByText('Spend by Vendor')).toBeInTheDocument()
    expect(screen.getByText('Acme Supplies')).toBeInTheDocument()
    expect(screen.getByText('Bolt Ltd')).toBeInTheDocument()
    expect(screen.getByText('₹12,500')).toBeInTheDocument()
    expect(screen.getByText('₹10,000')).toBeInTheDocument()
  })

  it('shows the empty state when there is no spend', () => {
    mocks.data = { ...sampleReport, rows: [], total: 0, count: 0 }
    render(<ReportsPage />)
    expect(screen.getByText(/no spend in this range/i)).toBeInTheDocument()
  })

  it('re-fetches when the group by changes', () => {
    render(<ReportsPage />)
    fireEvent.change(screen.getByLabelText(/group by/i), {
      target: { value: 'store' },
    })
    fireEvent.click(screen.getByRole('button', { name: /run report/i }))
    expect(mocks.path).toContain('groupBy=store')
  })

  it('exports the report as CSV', () => {
    mocks.data = sampleReport
    render(<ReportsPage />)
    fireEvent.click(screen.getByRole('button', { name: /export csv/i }))
    expect(downloadCSV).toHaveBeenCalledTimes(1)
    const [filename, rows] = vi.mocked(downloadCSV).mock.calls[0]
    expect(filename).toContain('spend-report-vendor-')
    expect(rows[0]).toEqual(['Label', 'Orders', 'Spend'])
    expect(rows[1]).toEqual(['Acme Supplies', '2', '10000'])
    expect(rows.at(-1)).toEqual(['Total', '3', '12500'])
  })

  it('shows errors from the API', () => {
    mocks.error = 'boom'
    render(<ReportsPage />)
    expect(screen.getByText('boom')).toBeInTheDocument()
  })
})
