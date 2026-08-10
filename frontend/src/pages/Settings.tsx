import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useFetch } from '../hooks/useFetch'
import { FEATURE_GROUPS } from '../lib/features'
import { Badge, Button, Card, EmptyState, ErrorBox, PageHeader, Spinner, Table } from '../components/ui'
import { badgeColor } from '../lib/status'
import type { User } from '../types'

export default function SettingsPage() {
  const users = useFetch<User[]>('/users')
  const [drafts, setDrafts] = useState<Record<number, string[] | null>>({})
  const [savingId, setSavingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [savedId, setSavedId] = useState<number | null>(null)

  const list = users.data ?? []

  useEffect(() => {
    if (!users.data) return
    const next: Record<number, string[] | null> = {}
    for (const u of users.data) next[u.id] = u.permissions ?? null
    setDrafts(next)
  }, [users.data])

  const isDefault = (id: number) => (drafts[id] ?? null) === null

  const toggle = (id: number, feature: string) => {
    setSavedId(null)
    setError(null)
    setDrafts((prev) => {
      const current = prev[id] ?? []
      const next = current.includes(feature)
        ? current.filter((f) => f !== feature)
        : [...current, feature]
      return { ...prev, [id]: next.length > 0 ? next : null }
    })
  }

  const save = async (id: number, value?: string[] | null) => {
    const finalValue = value !== undefined ? value : (drafts[id] ?? null)
    setSavingId(id)
    setError(null)
    setSavedId(null)
    try {
      await api.patch(`/users/${id}/permissions`, { permissions: finalValue })
      setSavedId(id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions')
    } finally {
      setSavingId(null)
    }
  }

  const reset = async (id: number) => {
    setDrafts((prev) => ({ ...prev, [id]: null }))
    setSavedId(null)
    await save(id, null)
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Control which tabs and features each user can access"
      />

      <Card className="mb-6 px-5 py-3 text-sm text-amber-800">
        Changes apply immediately on the backend. Users already signed in will see the
        updated access on their next login.
      </Card>

      {error && (
        <div className="mb-4">
          <ErrorBox message={error} />
        </div>
      )}

      {users.loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8" />
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No users yet" />
      ) : (
        <Card>
          <Table
            headers={['User', 'Feature access', '']}
          >
            {list.map((user) => (
              <tr key={user.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.mobile}</p>
                  <div className="mt-1">
                    <Badge color={badgeColor(user.role)}>{user.role}</Badge>
                    {user.status !== 'ACTIVE' && (
                      <span className="ml-2 text-xs text-slate-400">({user.status})</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {isDefault(user.id) && (
                    <p className="mb-2 text-xs font-medium text-blue-600">
                      All tabs allowed (role default)
                    </p>
                  )}
                  <div className="space-y-3">
                    {FEATURE_GROUPS.map((group) => (
                      <div key={group.label}>
                        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          {group.label}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {group.features.map((feature) => {
                            const checked = !isDefault(user.id) &&
                              (drafts[user.id] ?? []).includes(feature.key)
                            return (
                              <label
                                key={feature.key}
                                className="flex cursor-pointer items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggle(user.id, feature.key)}
                                  className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                {feature.label}
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col items-end gap-2">
                    <Button
                      size="sm"
                      disabled={savingId === user.id}
                      onClick={() => save(user.id)}
                    >
                      {savingId === user.id ? 'Saving…' : 'Save'}
                    </Button>
                    {!isDefault(user.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={savingId === user.id}
                        onClick={() => reset(user.id)}
                      >
                        Reset to default
                      </Button>
                    )}
                    {savedId === user.id && (
                      <span className="text-xs text-green-600">Saved</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  )
}
