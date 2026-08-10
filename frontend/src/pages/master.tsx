import { CrudPage } from '../components/CrudPage'
import type { CrudConfig } from '../components/CrudPage'
import { ItemImportButton } from '../components/ItemImport'
import { Badge } from '../components/ui'
import type { Item, User, Vendor } from '../types'
import { badgeColor } from '../lib/status'
import { useAuth } from '../auth/useAuth'

function VendorsPage() {
  const config: CrudConfig<Vendor> = {
    title: 'Vendors',
    endpoint: '/vendors',
    canDelete: true,
    columns: [
      { header: 'Vendor', render: (r) => <span className="font-medium text-slate-900">{r.vendorName}</span> },
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
    columns: [
      {
        header: 'Item Code',
        render: (r) => <span className="font-mono text-xs font-medium text-slate-900">{r.itemCode}</span>,
      },
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.itemName}</span> },
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
    deleteMessage: (r) => `Delete item "${r.itemName}"?`,
  }
  return <CrudPage config={config} />
}

function UsersPage() {
  const { user } = useAuth()
  const config: CrudConfig<User> = {
    title: 'Users',
    endpoint: '/users',
    subtitle: user?.role === 'ADMIN' ? 'Manage staff accounts' : 'Read-only list',
    canDelete: user?.role === 'ADMIN',
    columns: [
      { header: 'Name', render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
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
          { value: 'PURCHASER', label: 'PURCHASER' },
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
    deleteMessage: (r) => `Delete user "${r.name}"?`,
  }
  return <CrudPage config={config} />
}

export { VendorsPage, ItemsPage, UsersPage }
