import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PrintButton, PrintSheet } from './print'

describe('PrintButton', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('triggers window.print when clicked', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    const user = userEvent.setup()
    render(<PrintButton />)
    await user.click(screen.getByRole('button', { name: /print/i }))
    expect(print).toHaveBeenCalledTimes(1)
  })

  it('accepts a custom label', () => {
    render(<PrintButton label="Download PDF" />)
    expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument()
  })
})

describe('PrintSheet', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the letterhead, meta, columns and rows', () => {
    render(
      <PrintSheet
        title="Purchase Order"
        number="PO-001"
        meta={[
          { label: 'Vendor', value: 'Acme Traders' },
          { label: 'Status', value: 'PENDING' },
        ]}
        columns={['Item', 'Qty']}
        rows={[
          ['Steel rod', '10'],
          ['Cement', '5'],
        ]}
      />,
    )
    expect(screen.getByText('GRS IPS')).toBeInTheDocument()
    expect(screen.getByText('Purchase Order')).toBeInTheDocument()
    expect(screen.getByText('PO-001')).toBeInTheDocument()
    expect(screen.getByText('Acme Traders')).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
    expect(screen.getByText('Steel rod')).toBeInTheDocument()
    expect(screen.getByText('Cement')).toBeInTheDocument()
  })

  it('renders the print-only container classes', () => {
    const { container } = render(<PrintSheet title="PO" columns={['Item']} rows={[['X']]} />)
    expect(container.firstElementChild?.className).toContain('print-sheet')
    expect(container.firstElementChild?.className).toContain('hidden')
  })
})
