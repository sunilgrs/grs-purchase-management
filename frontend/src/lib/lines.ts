export interface LineDraft {
  key: number
  itemId: string
  quantity: string
  unitPrice?: string
  condition?: string
}

let lineKeyCounter = 1

export function newLine(partial: Partial<LineDraft> = {}): LineDraft {
  return { key: lineKeyCounter++, itemId: '', quantity: '', ...partial }
}
