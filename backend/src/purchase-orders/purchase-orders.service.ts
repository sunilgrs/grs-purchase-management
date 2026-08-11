import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto.js';
import { UpdatePurchaseOrderDto } from './dto/update-purchase-order.dto.js';
import { sequentialNumber } from '../common/doc-number.js';

const PO_INCLUDE = {
  Vendor: {
    select: { id: true, vendorName: true, contactPerson: true, mobile: true },
  },
  Requirement: {
    include: {
      Store: true,
      requestedBy: { select: { id: true, name: true } },
    },
  },
  items: {
    include: {
      Item: {
        include: { Category: true },
      },
    },
  },
} as const;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(
    createPurchaseOrderDto: CreatePurchaseOrderDto,
    performedById?: number | null,
  ) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: createPurchaseOrderDto.requirementId },
      include: { items: true },
    });
    if (!requirement) {
      throw new NotFoundException(
        `Requirement #${createPurchaseOrderDto.requirementId} not found`,
      );
    }
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: createPurchaseOrderDto.vendorId },
    });
    if (!vendor) {
      throw new NotFoundException(
        `Vendor #${createPurchaseOrderDto.vendorId} not found`,
      );
    }

    const requirementItemIds = new Set(requirement.items.map((i) => i.itemId));
    const invalid = createPurchaseOrderDto.items.filter(
      (i) => !requirementItemIds.has(i.itemId),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `PO items must belong to the requirement. Invalid item(s): ${invalid.map((i) => i.itemId).join(', ')}`,
      );
    }

    const count = await this.prisma.purchaseOrder.count();
    const poNumber = sequentialNumber('PO', count);

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        requirementId: createPurchaseOrderDto.requirementId,
        vendorId: createPurchaseOrderDto.vendorId,
        expectedDate: new Date(createPurchaseOrderDto.expectedDate),
        notes: createPurchaseOrderDto.notes,
        items: {
          create: createPurchaseOrderDto.items.map((i) => ({
            itemId: i.itemId,
            orderedQty: i.orderedQty,
            unitPrice: i.unitPrice ?? null,
          })),
        },
      },
      include: PO_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'PurchaseOrder',
      entityId: purchaseOrder.id,
      action: 'CREATED',
      description: `Purchase order ${poNumber} created against requirement ${requirement.requirementNo}`,
      performedById,
    });

    await this.prisma.requirement.update({
      where: { id: requirement.id },
      data: { status: 'VENDOR_ASSIGNED' },
    });

    return this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrder.id },
      include: PO_INCLUDE,
    });
  }

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      orderBy: { id: 'desc' },
      include: {
        ...PO_INCLUDE,
        _count: { select: { items: true, Delivery: true } },
      },
    });
  }

  async findOne(id: number) {
    const purchaseOrder = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: PO_INCLUDE,
    });
    if (!purchaseOrder)
      throw new NotFoundException(`PurchaseOrder #${id} not found`);
    return purchaseOrder;
  }

  async update(id: number, updatePurchaseOrderDto: UpdatePurchaseOrderDto) {
    await this.findOne(id);

    if (
      updatePurchaseOrderDto.requirementId ||
      updatePurchaseOrderDto.vendorId
    ) {
      throw new BadRequestException(
        'requirementId and vendorId cannot be changed after creation',
      );
    }

    const data: Record<string, unknown> = {
      status: updatePurchaseOrderDto.status,
      notes: updatePurchaseOrderDto.notes,
    };
    if (updatePurchaseOrderDto.expectedDate) {
      data.expectedDate = new Date(updatePurchaseOrderDto.expectedDate);
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: data,
      include: PO_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { deleted: true, id };
  }
}
