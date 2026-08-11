import { describe, it, expect, vi } from 'vitest'
import { downloadCSV } from './csv'

describe('downloadCSV', () => {
  it('escapes commas, quotes and newlines in cells', async () => {
    const blobData: Blob[] = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      blobData.push(blob)
      return 'blob:mock'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCSV('report.csv', [
      ['a,b', 'c"d', 'e\nf'],
      ['plain', '123', '0'],
    ])

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    const buf = await blobData[0].arrayBuffer()
    const text = new TextDecoder('utf-8', { ignoreBOM: true }).decode(buf)
    expect(text.startsWith('\uFEFF')).toBe(true)
    expect(text.slice(1)).toBe('"a,b","c""d","e\nf"\nplain,123,0')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock')
  })

  it('downloads with the given filename', () => {
    URL.createObjectURL = vi.fn(() => 'blob:mock')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const originalAppend = document.body.appendChild.bind(document.body)
    const appendChild = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation((node) => originalAppend(node))

    downloadCSV('spend-report-month.csv', [['a']])

    expect(appendChild).toHaveBeenCalledTimes(1)
    const anchor = appendChild.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.getAttribute('download')).toBe('spend-report-month.csv')
    expect(anchor.getAttribute('href')).toBe('blob:mock')
  })
})
