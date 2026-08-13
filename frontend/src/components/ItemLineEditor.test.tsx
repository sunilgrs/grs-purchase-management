import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemLineEditor } from './ItemLineEditor'
import { newLine } from '../lib/lines'
import type { Item } from '../types'

const items: Item[] = [
  {
    id: 1,
    itemCode: 'ITM-1',
    itemName: 'Cement',
    categoryId: 1,
    unit: 'bag',
    preferredVendorId: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    itemCode: 'ITM-2',
    itemName: 'Steel Rods',
    categoryId: 1,
    unit: 'no',
    preferredVendorId: null,
    active: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
]

const renderEditor = (props: Partial<Parameters<typeof ItemLineEditor>[0]> = {}) => {
  const onChange = vi.fn()
  render(
    <ItemLineEditor
      items={items}
      lines={[]}
      onChange={onChange}
      {...props}
    />,
  )
  return { onChange }
}

describe('ItemLineEditor', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the empty hint when there are no lines', () => {
    renderEditor()
    expect(screen.getByText(/no items yet/i)).toBeInTheDocument()
  })

  it('disables Add item when the item list is empty', () => {
    renderEditor({ items: [] })
    expect(screen.getByRole('button', { name: /add item/i })).toBeDisabled()
  })

  it('adds a line when Add item is clicked', async () => {
    const user = userEvent.setup()
    const { onChange } = renderEditor()
    await user.click(screen.getByRole('button', { name: /add item/i }))
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ itemId: '', quantity: '' })])
  })

  it('renders existing lines with item options', () => {
    const lines = [newLine({ itemId: '1', quantity: '10' })]
    renderEditor({ lines })
    expect(screen.getByDisplayValue('Cement (ITM-1)')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('hides inactive items from the dropdown', () => {
    const inactive = { ...items[0], id: 3, itemCode: 'ITM-3', itemName: 'Retired', active: false }
    renderEditor({ items: [...items, inactive], lines: [newLine()] })
    expect(screen.getByRole('option', { name: 'Cement (ITM-1)' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Retired (ITM-3)' })).not.toBeInTheDocument()
  })

  it('updates a line when the item selection changes', async () => {
    const user = userEvent.setup()
    const lines = [newLine({ itemId: '1', quantity: '10' })]
    const { onChange } = renderEditor({ lines })
    await user.selectOptions(screen.getByDisplayValue('Cement (ITM-1)'), '2')
    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({ key: lines[0].key, itemId: '2', quantity: '10' }),
    ])
  })

  it('removes a line', async () => {
    const user = userEvent.setup()
    const lines = [newLine({ itemId: '1' }), newLine({ itemId: '2' })]
    const { onChange } = renderEditor({ lines })
    const removeButtons = screen.getAllByTitle('Remove line')
    await user.click(removeButtons[0])
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ itemId: '2' })])
  })

  it('renders price options when includePrice is set', () => {
    renderEditor({ includePrice: true, lines: [newLine({ itemId: '1' })] })
    expect(screen.getByRole('option', { name: '₹10' })).toBeInTheDocument()
  })

  it('renders condition options when includeCondition is set', () => {
    renderEditor({ includeCondition: true, lines: [newLine({ itemId: '1' })] })
    expect(screen.getByRole('option', { name: 'DAMAGED' })).toBeInTheDocument()
  })
})
