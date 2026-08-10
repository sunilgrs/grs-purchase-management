import { useRef, useState } from 'react'
import { request } from '../lib/api'
import { useAuth } from '../auth/useAuth'
import { Button, Modal, Spinner } from './ui'

interface ImportError {
  row: number
  message: string
}

interface ImportSummary {
  created: number
  updated: number
  skipped: number
  errors: ImportError[]
}

export function ItemImportButton({ onDone }: { onDone: () => void }) {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (user?.role !== 'ADMIN' && user?.role !== 'MANAGER') return null

  const upload = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    setBusy(true)
    setError(null)
    setSummary(null)
    try {
      const res = await request<ImportSummary>('/items/import', {
        method: 'POST',
        body: form,
      })
      setSummary(res)
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setOpen(true)
    if (!/\.(xlsx|xls)$/i.test(file.name)) {
      setError('Please choose an .xlsx or .xls file.')
      return
    }
    void upload(file)
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={onFile}
      />
      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 5.75a.75.75 0 00-1.5 0v6.19l-2.22-2.22a.75.75 0 00-1.06 1.06l3.5 3.5a.75.75 0 001.06 0l3.5-3.5a.75.75 0 00-1.06-1.06l-2.22 2.22V5.75zM3.5 14.25a.75.75 0 011.5 0v1a.75.75 0 00.75.75h8.5a.75.75 0 00.75-.75v-1a.75.75 0 011.5 0v1a2.25 2.25 0 01-2.25 2.25h-8.5A2.25 2.25 0 013.5 15.25v-1z" />
        </svg>
        Import Excel
      </Button>

      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false)
        }}
        title="Import Excel"
      >
        {busy ? (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-slate-600">
            <Spinner />
            Uploading and importing items…
          </div>
        ) : error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md bg-green-50 px-3 py-2 text-center">
                <p className="text-lg font-semibold text-green-700">{summary.created}</p>
                <p className="text-xs text-green-600">Created</p>
              </div>
              <div className="rounded-md bg-blue-50 px-3 py-2 text-center">
                <p className="text-lg font-semibold text-blue-700">{summary.updated}</p>
                <p className="text-xs text-blue-600">Updated</p>
              </div>
              <div className="rounded-md bg-amber-50 px-3 py-2 text-center">
                <p className="text-lg font-semibold text-amber-700">{summary.skipped}</p>
                <p className="text-xs text-amber-600">Skipped</p>
              </div>
            </div>
            {summary.errors.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-medium text-slate-700">Skipped rows</p>
                <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md bg-slate-50 p-3 text-sm">
                  {summary.errors.map((err, i) => (
                    <li key={i} className="text-slate-700">
                      <span className="font-mono text-xs text-slate-400">Row {err.row}</span>{' '}
                      {err.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </>
  )
}
