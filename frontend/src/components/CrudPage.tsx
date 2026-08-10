import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { api } from '../lib/api'
import { useApiAction, useFetch } from '../hooks/useFetch'
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorBox,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
} from './ui'

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'checkbox'
  | 'select'
  | 'textarea'

export interface CrudOption {
  value: string | number
  label: string
}

export interface CrudField {
  name: string
  label: string
  type: FieldType
  required?: boolean
  placeholder?: string
  options?: CrudOption[]
  optionsEndpoint?: string
  createOnly?: boolean
  step?: string
  default?: string | number | boolean
}

export interface CrudColumn<T> {
  header: string
  render: (row: T) => ReactNode
}

export interface CrudConfig<T> {
  title: string
  subtitle?: string
  endpoint: string
  columns: CrudColumn<T>[]
  fields: CrudField[]
  canDelete?: boolean
  deleteMessage?: (row: T) => string
  extraActions?: (row: T) => ReactNode
  headerActions?: (helpers: { reload: () => void }) => ReactNode
  createPayload: (values: Record<string, unknown>) => Record<string, unknown>
  updatePayload?: (values: Record<string, unknown>) => Record<string, unknown>
}

type FormValues = Record<string, unknown>

export function CrudPage<T extends { id: number }>({
  config,
  refreshKey = 0,
}: {
  config: CrudConfig<T>
  refreshKey?: number
}) {
  const { data, loading, error, reload } = useFetch<T[]>(config.endpoint)
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [deleting, setDeleting] = useState<T | null>(null)
  const [optionMap, setOptionMap] = useState<Record<string, CrudOption[]>>({})
  const action = useApiAction()

  useEffect(() => {
    if (refreshKey > 0) reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey])

  const createFields = config.fields.filter((f) => !f.createOnly || !editing)

  useEffect(() => {
    let cancelled = false
    const endpoints = config.fields
      .filter((f) => f.optionsEndpoint)
      .map((f) => f.optionsEndpoint as string)
    Promise.all(
      endpoints.map(async (ep) => {
        const rows = (await api.get<Array<{ id: number; [k: string]: unknown }>>(ep)) as Array<{
          id: number
          [k: string]: unknown
        }>
        const labelKey =
          'name' in rows[0] ? 'name' : 'vendorName' in rows[0] ? 'vendorName' : 'storeName'
        return [
          ep,
          rows.map((r) => ({
            value: r.id,
            label: String(r[labelKey] ?? r.id),
          })),
        ] as [string, CrudOption[]]
      }),
    ).then((pairs) => {
      if (!cancelled) setOptionMap(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const emptyValues = (): FormValues => {
    const v: FormValues = {}
    for (const f of createFields) {
      v[f.name] = f.default ?? (f.type === 'checkbox' ? false : '')
    }
    return v
  }

  const [values, setValues] = useState<FormValues>({})

  const openCreate = () => {
    setEditing(null)
    setValues(emptyValues())
    setShowCreate(true)
  }

  const openEdit = (row: T) => {
    setEditing(row)
    const v: FormValues = {}
    for (const f of config.fields) {
      if (f.createOnly) continue
      const raw = (row as unknown as Record<string, unknown>)[f.name]
      v[f.name] = raw ?? (f.type === 'checkbox' ? false : '')
    }
    setValues(v)
    setShowCreate(true)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const body = editing && config.updatePayload ? config.updatePayload(values) : config.createPayload(values)
    const ok = editing
      ? await action.run(() => api.patch(`${config.endpoint}/${editing.id}`, body))
      : await action.run(() => api.post(config.endpoint, body))
    if (ok !== undefined) {
      setShowCreate(false)
      reload()
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const ok = await action.run(() => api.delete(`${config.endpoint}/${deleting.id}`))
    if (ok !== undefined) {
      setDeleting(null)
      action.clearError()
      reload()
    }
  }

  return (
    <div>
      <PageHeader
        title={config.title}
        subtitle={config.subtitle}
        actions={
          <>
            {config.headerActions?.({ reload })}
            <Button onClick={openCreate}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
              </svg>
              New
            </Button>
          </>
        }
      />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : !data || data.length === 0 ? (
          <EmptyState title={`No ${config.title.toLowerCase()} yet`} hint="Click New to add one." />
        ) : (
          <Table headers={[...config.columns.map((c) => c.header), <span key="actions"></span>]}>
            {data.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                {config.columns.map((col, i) => (
                  <td key={i} className="px-4 py-3">
                    {col.render(row)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {config.extraActions?.(row)}
                    <Button size="sm" variant="ghost" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    {config.canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          action.clearError()
                          setDeleting(row)
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title={editing ? `Edit ${config.title.replace(/s$/, '')}` : `New ${config.title.replace(/s$/, '')}`}
      >
        <form onSubmit={submit} className="space-y-4">
          {createFields.map((field) => {
            const key = `f_${field.name}`
            const value = values[field.name] as string | number | boolean
            const set = (v: unknown) => setValues((prev) => ({ ...prev, [field.name]: v }))

            if (field.type === 'checkbox') {
              return (
                <label key={key} className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={Boolean(value)}
                    onChange={(e) => set(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  {field.label}
                </label>
              )
            }

            if (field.type === 'select') {
              const options = field.options ?? optionMap[field.optionsEndpoint ?? ''] ?? []
              return (
                <Select key={key} label={field.label} required={field.required} value={String(value ?? '')} onChange={(e) => set(e.target.value)}>
                  <option value="">— Select —</option>
                  {options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )
            }

            if (field.type === 'textarea') {
              return (
                <label key={key} className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </span>
                  <textarea
                    rows={3}
                    value={String(value ?? '')}
                    onChange={(e) => set(e.target.value)}
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </label>
              )
            }

            return (
              <Input
                key={key}
                label={field.label}
                required={field.required}
                type={field.type}
                placeholder={field.placeholder}
                step={field.step}
                value={value === true || value === false ? '' : String(value ?? '')}
                onChange={(e) => set(e.target.value)}
              />
            )
          })}

          {action.error && <div className="text-sm text-red-600">{action.error}</div>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={action.submitting}>
              {action.submitting ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Confirm delete"
        message={deleting ? (config.deleteMessage?.(deleting) ?? `Delete this ${config.title.replace(/s$/, '').toLowerCase()}? This cannot be undone.`) : `Delete this ${config.title.replace(/s$/, '').toLowerCase()}? This cannot be undone.`}
        error={action.error}
        onCancel={() => {
          action.clearError()
          setDeleting(null)
        }}
        onConfirm={confirmDelete}
        busy={action.submitting}
      />
    </div>
  )
}
