export interface AuthUser {
  id: number
  name: string
  mobile: string
  email: string | null
  role: string
  status: string
}

export interface Store {
  id: number
  storeName: string
  location: string | null
  createdAt: string
  _count?: { Requirement: number }
}

export interface Vendor {
  id: number
  vendorName: string
  contactPerson: string | null
  mobile: string | null
  whatsapp: string | null
  email: string | null
  address: string | null
  active: boolean
  createdAt: string
  updatedAt: string
  _count?: { Item: number; PurchaseOrder: number }
}

export interface Category {
  id: number
  name: string
  createdAt: string
  _count?: { Item: number }
}

export interface User {
  id: number
  name: string
  mobile: string
  email: string | null
  role: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: number
  itemCode: string
  itemName: string
  categoryId: number | null
  unit: string
  preferredVendorId: number | null
  active: boolean
  createdAt: string
  updatedAt: string
  Category?: { id: number; name: string } | null
  Vendor?: { id: number; vendorName: string } | null
}

export interface RequirementItem {
  id: number
  requirementId: number
  itemId: number
  quantity: number
  Item?: { id: number; itemCode: string; itemName: string; unit: string } | null
}

export interface Requirement {
  id: number
  requirementNo: string
  storeId: number
  requestedById: number
  requiredDate: string
  priority: string
  status: string
  approvedById: number | null
  remarks: string | null
  createdAt: string
  updatedAt: string
  Store?: { id: number; storeName: string } | null
  requestedBy?: { id: number; name: string } | null
  approvedBy?: { id: number; name: string } | null
  items?: RequirementItem[]
  _count?: { items: number; PurchaseOrder: number }
}

export interface PurchaseOrderItem {
  id: number
  poId: number
  itemId: number
  orderedQty: number
  receivedQty: number
  unitPrice: number | null
  Item?: { id: number; itemCode: string; itemName: string; unit: string } | null
}

export interface PurchaseOrder {
  id: number
  poNumber: string
  requirementId: number
  vendorId: number
  orderDate: string
  expectedDate: string
  status: string
  notes: string | null
  createdAt: string
  updatedAt: string
  Vendor?: { id: number; vendorName: string } | null
  Requirement?: { id: number; requirementNo: string; status: string } | null
  items?: PurchaseOrderItem[]
  _count?: { items: number; Delivery: number }
}

export interface DeliveryItem {
  id: number
  deliveryId: number
  itemId: number
  receivedQty: number
  condition: string
  remarks: string | null
  Item?: { id: number; itemCode: string; itemName: string; unit: string } | null
}

export interface Delivery {
  id: number
  poId: number
  deliveryDate: string
  receivedById: number
  status: string
  remarks: string | null
  createdAt: string
  User?: { id: number; name: string } | null
  PurchaseOrder?: { id: number; poNumber: string; status: string } | null
  items?: DeliveryItem[]
  _count?: { items: number; Discrepancy: number }
}

export interface Discrepancy {
  id: number
  poId: number
  deliveryId: number
  itemId: number
  discrepancyType: string
  quantity: number | null
  description: string | null
  photo: string | null
  status: string
  createdAt: string
  updatedAt: string
  Item?: { id: number; itemCode: string; itemName: string; unit: string } | null
  Delivery?: { id: number; deliveryDate: string; status: string } | null
  PurchaseOrder?: { id: number; poNumber: string; status: string } | null
}

export interface AuditLog {
  id: number
  entityType: string
  entityId: string
  action: string
  description: string | null
  performedById: number | null
  createdAt: string
  User?: { id: number; name: string; mobile: string } | null
}

export type StatusColor = 'slate' | 'green' | 'amber' | 'red' | 'blue' | 'violet'
