-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'STORE_KEEPER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poNumber" TEXT NOT NULL,
    "requirementId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "orderDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expectedDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrder_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PurchaseOrderItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "orderedQty" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL DEFAULT 0,
    "unitPrice" REAL,
    CONSTRAINT "PurchaseOrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PurchaseOrderItem_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT,
    "performedById" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Delivery" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poId" INTEGER NOT NULL,
    "deliveryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedById" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PARTIAL',
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Delivery_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Delivery_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DeliveryItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "deliveryId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "receivedQty" INTEGER NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "remarks" TEXT,
    CONSTRAINT "DeliveryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "DeliveryItem_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Discrepancy" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "poId" INTEGER NOT NULL,
    "deliveryId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "discrepancyType" TEXT NOT NULL,
    "quantity" INTEGER,
    "description" TEXT,
    "photo" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Discrepancy_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Discrepancy_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "Delivery" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Discrepancy_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "itemCode" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "categoryId" INTEGER,
    "unit" TEXT NOT NULL DEFAULT 'Nos',
    "preferredVendorId" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_preferredVendorId_fkey" FOREIGN KEY ("preferredVendorId") REFERENCES "Vendor" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Requirement" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requirementNo" TEXT NOT NULL,
    "storeId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "requiredDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "approvedById" INTEGER,
    "remarks" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Requirement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Requirement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Requirement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "requirementId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "RequirementItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RequirementItem_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "Requirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Store" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "storeName" TEXT NOT NULL,
    "location" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "vendorName" TEXT NOT NULL,
    "contactPerson" TEXT,
    "mobile" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_mobile_key" ON "User"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PurchaseOrderItem_poId_idx" ON "PurchaseOrderItem"("poId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE INDEX "Delivery_poId_idx" ON "Delivery"("poId");

-- CreateIndex
CREATE INDEX "DeliveryItem_deliveryId_idx" ON "DeliveryItem"("deliveryId");

-- CreateIndex
CREATE INDEX "Discrepancy_poId_idx" ON "Discrepancy"("poId");

-- CreateIndex
CREATE INDEX "Discrepancy_status_idx" ON "Discrepancy"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Item_itemCode_key" ON "Item"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "Requirement_requirementNo_key" ON "Requirement"("requirementNo");

-- CreateIndex
CREATE INDEX "Requirement_storeId_idx" ON "Requirement"("storeId");

-- CreateIndex
CREATE INDEX "Requirement_status_idx" ON "Requirement"("status");

-- CreateIndex
CREATE INDEX "RequirementItem_requirementId_idx" ON "RequirementItem"("requirementId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_storeName_key" ON "Store"("storeName");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_vendorName_key" ON "Vendor"("vendorName");
