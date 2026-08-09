import { Button, Select } from './ui'
import type { Item } from '../types'
import { newLine, type LineDraft } from '../lib/lines'

export type { LineDraft }


export function ItemLineEditor({
  items,
  lines,
  onChange,
  includePrice = false,
  includeCondition = false,
}: {
  items: Item[]
  lines: LineDraft[]
  onChange: (lines: LineDraft[]) => void
  includePrice?: boolean
  includeCondition?: boolean
}) {
  const update = (key: number, patch: Partial<LineDraft>) =>
    onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)))

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Items *</span>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => onChange([...lines, newLine()])}
          disabled={items.length === 0}
        >
          + Add item
        </Button>
      </div>

      {lines.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 px-3 py-4 text-center text-xs text-slate-400">
          No items yet. Add at least one item line.
        </p>
      ) : (
        <div className="space-y-2">
          {lines.map((line) => (
            <div key={line.key} className="flex items-end gap-2">
              <div className="flex-1">
                <Select value={line.itemId} onChange={(e) => update(line.key, { itemId: e.target.value })}>
                  <option value="">— Select item —</option>
                  {items.map((it) => (
                    <option key={it.id} value={String(it.id)}>
                      {it.itemName} ({it.itemCode})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-28">
                <Select label=" " value={line.quantity} onChange={(e) => update(line.key, { quantity: e.target.value })}>
                  <option value="">Qty</option>
                  {[1, 2, 5, 10, 15, 20, 25, 50, 100].map((q) => (
                    <option key={q} value={String(q)}>
                      {q}
                    </option>
                  ))}
                </Select>
              </div>
              {includePrice && (
                <div className="w-32">
                  <Select label=" " value={line.unitPrice ?? ''} onChange={(e) => update(line.key, { unitPrice: e.target.value })}>
                    <option value="">Price</option>
                    <option value="0">0</option>
                    {[10, 20, 50, 100, 200, 500, 1000, 2000, 5000].map((p) => (
                      <option key={p} value={String(p)}>
                        ₹{p}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {includeCondition && (
                <div className="w-36">
                  <Select
                    label=" "
                    value={line.condition ?? ''}
                    onChange={(e) => update(line.key, { condition: e.target.value })}
                  >
                    <option value="">Condition</option>
                    <option value="GOOD">GOOD</option>
                    <option value="DAMAGED">DAMAGED</option>
                    <option value="SHORTAGE">SHORTAGE</option>
                    <option value="MISMATCH">MISMATCH</option>
                  </Select>
                </div>
              )}
              <button
                type="button"
                onClick={() => onChange(lines.filter((l) => l.key !== line.key))}
                className="mb-0.5 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                title="Remove line"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
