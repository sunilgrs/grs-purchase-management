import { useState } from 'react'
import { CrudPage } from '../components/CrudPage'
import type { CrudConfig } from '../components/CrudPage'
import { ItemImportButton } from '../components/ItemImport'
import { Badge, Button, ConfirmDialog, Modal } from '../components/ui'
import { api } from '../lib/api'
import type { Item, User, Vendor } from '../types'
import { badgeColor } from '../lib/status'
import { useAuth } from '../auth/useAuth'

function VendorsPage() {
  const config: CrudConfig<Vendor> = {
    title: 'Vendors',
    endpoint: '/vendors',
    canDelete: true,
    isActive: (r) => Boolean(r.active),
    columns: [
      { header: 'Vendor', render: (r) => <span className="font-medium text-emerald-950">{r.vendorName}</span> },
      { header: 'Contact', render: (r) => r.contactPerson || '—' },
      { header: 'Mobile', render: (r) => r.mobile || '—' },
      { header: 'Email', render: (r) => r.email || '—' },
      {
        header: 'Status',
        render: (r) => (
          <Badge color={badgeColor(r.active ? 'active' : 'inactive')}>
            {r.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ],
    fields: [
      { name: 'vendorName', label: 'Vendor Name', type: 'text', required: true },
      { name: 'contactPerson', label: 'Contact Person', type: 'text' },
      { name: 'mobile', label: 'Mobile', type: 'text' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'text' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'active', label: 'Active', type: 'checkbox', default: true },
    ],
    createPayload: (v) => ({
      vendorName: v.vendorName,
      contactPerson: v.contactPerson || undefined,
      mobile: v.mobile || undefined,
      whatsapp: v.whatsapp || undefined,
      email: v.email || undefined,
      address: v.address || undefined,
      active: Boolean(v.active),
    }),
  }
  return <CrudPage config={config} />
}

function ItemsPage() {
  const config: CrudConfig<Item> = {
    title: 'Items',
    endpoint: '/items',
    canDelete: true,
    headerActions: ({ reload }) => <ItemImportButton onDone={reload} />,
    isActive: (r) => Boolean(r.active),
    columns: [
      {
        header: 'Item Code',
        render: (r) => <span className="font-mono text-xs font-medium text-emerald-950">{r.itemCode}</span>,
      },
      { header: 'Name', render: (r) => <span className="font-medium text-emerald-950">{r.itemName}</span> },
      { header: 'Category', render: (r) => r.Category?.name || '—' },
      { header: 'Unit', render: (r) => r.unit },
      {
        header: 'Status',
        render: (r) => (
          <Badge color={badgeColor(r.active ? 'active' : 'inactive')}>
            {r.active ? 'Active' : 'Inactive'}
          </Badge>
        ),
      },
    ],
    fields: [
      { name: 'itemCode', label: 'Item Code', type: 'text', required: true, placeholder: 'e.g. ITM-001' },
      { name: 'itemName', label: 'Item Name', type: 'text', required: true },
      { name: 'categoryId', label: 'Category', type: 'select', optionsEndpoint: '/categories' },
      { name: 'unit', label: 'Unit', type: 'text', required: true, placeholder: 'e.g. kg, box, pcs' },
      { name: 'preferredVendorId', label: 'Preferred Vendor', type: 'select', optionsEndpoint: '/vendors' },
      { name: 'active', label: 'Active', type: 'checkbox', default: true },
    ],
    createPayload: (v) => ({
      itemCode: v.itemCode,
      itemName: v.itemName,
      categoryId: v.categoryId ? Number(v.categoryId) : undefined,
      unit: v.unit,
      preferredVendorId: v.preferredVendorId ? Number(v.preferredVendorId) : undefined,
      active: Boolean(v.active),
    }),
    updatePayload: (v) => ({
      itemName: v.itemName,
      categoryId: v.categoryId ? Number(v.categoryId) : undefined,
      unit: v.unit,
      preferredVendorId: v.preferredVendorId ? Number(v.preferredVendorId) : undefined,
      active: Boolean(v.active),
    }),
    deleteMessage: (r) => `Deactivate item "${r.itemName}"?`,
  }
  return <CrudPage config={config} />
}

function UsersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [resetTarget, setResetTarget] = useState<User | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [resetName, setResetName] = useState('')
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetting, setResetting] = useState(false)
  const [copied, setCopied] = useState(false)

  const confirmReset = async () => {
    if (!resetTarget) return
    setResetting(true)
    setResetError(null)
    try {
      const res = await api.post<{ temporaryPassword: string }>(
        `/users/${resetTarget.id}/reset-password`,
        {},
      )
      setTempPassword(res.temporaryPassword)
      setResetName(resetTarget.name)
      setResetTarget(null)
    } catch (err) {
      setResetError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setResetting(false)
    }
  }

  const copyTemporaryPassword = async () => {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
    } catch {
      /* clipboard unavailable */
    }
  }

  const closeReset = () => {
    setResetError(null)
    setResetTarget(null)
  }

  const closeTempModal = () => {
    setTempPassword(null)
    setCopied(false)
  }

  const config: CrudConfig<User> = {
    title: 'Users',
    endpoint: '/users',
    subtitle: isAdmin ? 'Manage staff accounts' : 'Read-only list',
    canDelete: isAdmin,
    isActive: (r) => r.status === 'ACTIVE',
    extraActions: isAdmin
      ? (r) => (
          <Button size="sm" variant="ghost" onClick={() => setResetTarget(r)}>
            Reset
          </Button>
        )
      : undefined,
    columns: [
      { header: 'Name', render: (r) => <span className="font-medium text-emerald-950">{r.name}</span> },
      { header: 'Mobile', render: (r) => r.mobile },
      { header: 'Email', render: (r) => r.email || '—' },
      { header: 'Role', render: (r) => <Badge color={badgeColor(r.role)}>{r.role}</Badge> },
      {
        header: 'Status',
        render: (r) => (
          <Badge color={badgeColor(r.status)}>{r.status.replace('_', ' ')}</Badge>
        ),
      },
    ],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true },
      { name: 'mobile', label: 'Mobile', type: 'text', required: true },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'password', label: 'Password', type: 'password', createOnly: true, required: true },
      {
        name: 'role',
        label: 'Role',
        type: 'select',
        required: true,
        options: [
          { value: 'ADMIN', label: 'ADMIN' },
          { value: 'STORE_KEEPER', label: 'STORE_KEEPER' },
          { value: 'MANAGER', label: 'MANAGER' },
        ],
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'ACTIVE', label: 'ACTIVE' },
          { value: 'INACTIVE', label: 'INACTIVE' },
        ],
      },
    ],
    createPayload: (v) => ({
      name: v.name,
      mobile: v.mobile,
      email: v.email || undefined,
      password: v.password,
      role: v.role,
      status: v.status,
    }),
    updatePayload: (v) => ({
      name: v.name,
      mobile: v.mobile,
      email: v.email || undefined,
      role: v.role,
      status: v.status,
    }),
    deleteMessage: (r) => `Deactivate user "${r.name}"?`,
  }
  return (
    <>
      <CrudPage config={config} />
      <ConfirmDialog
        open={Boolean(resetTarget)}
        title="Reset password"
        message={
          resetTarget
            ? `Generate a temporary password for "${resetTarget.name}"? They can change it after signing in.`
            : ''
        }
        error={resetError}
        onCancel={closeReset}
        onConfirm={confirmReset}
        busy={resetting}
        confirmLabel="Reset password"
        busyLabel="Resetting…"
        variant="secondary"
      />
      <Modal open={Boolean(tempPassword)} onClose={closeTempModal} title="Temporary password">
        <p className="text-sm text-slate-600">
          Share this temporary password with {resetName || 'the user'}. They can sign in with it
          and change it afterwards.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <code className="flex-1 rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 font-mono text-sm text-emerald-900">
            {tempPassword}
          </code>
          <Button variant="secondary" onClick={copyTemporaryPassword}>
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={closeTempModal}>Done</Button>
        </div>
      </Modal>
    </>
  )
}

export { VendorsPage, ItemsPage, UsersPage }
