import { Badge, Card, ErrorBox, PageHeader, Spinner, Table } from '../components/ui'
import { useFetch } from '../hooks/useFetch'
import { formatDateTime } from '../lib/format'
import { badgeColor } from '../lib/status'
import type { AuditLog } from '../types'

export default function AuditLogsPage() {
  const { data, loading, error, reload } = useFetch<AuditLog[]>('/audit-logs')

  return (
    <div>
      <PageHeader title="Audit Logs" subtitle="Read-only trail of actions across the system." />

      {error && <div className="mb-4"><ErrorBox message={error} onRetry={reload} /></div>}

      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner className="h-8 w-8" /></div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">No audit events yet.</div>
        ) : (
          <Table headers={['When', 'Entity', 'Action', 'Description', 'Performed By']}>
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">{formatDateTime(log.createdAt)}</td>
                <td className="px-4 py-3">
                  <Badge color="blue">{log.entityType}</Badge>
                  <span className="ml-2 font-mono text-xs text-slate-400">{log.entityId}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge color={badgeColor(log.action)}>{log.action}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{log.description ?? '—'}</td>
                <td className="px-4 py-3">{log.User?.name ?? 'System'}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  )
}
