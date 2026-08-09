import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { DiscrepanciesService } from '../discrepancies/discrepancies.service.js';
import { CreateDeliveryDto } from './dto/create-delivery.dto.js';
import { UpdateDeliveryDto } from './dto/update-delivery.dto.js';

const CONDITION_TO_DISCREPANCY_TYPE: Record<string, string> = {
  DAMAGED: 'DAMAGE',
  SHORTAGE: 'SHORTAGE',
  MISMATCH: 'WRONG_ITEM',
};

const DELIVERY_INCLUDE = {
  User: { select: { id: true, name: true, mobile: true } },
  PurchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      status: true,
      Vendor: { select: { id: true, vendorName: true } },
    },
  },
  items: {
    include: {
      Item: {
        select: { id: true, itemCode: true, itemName: true, unit: true },
      },
    },
  },
} as const;

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly discrepanciesService: DiscrepanciesService,
  ) {}

  async create(
    createDeliveryDto: CreateDeliveryDto,
    performedById?: number | null,
  ) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: createDeliveryDto.poId },
      include: { items: true },
    });
    if (!po)
      throw new NotFoundException(
        `PurchaseOrder #${createDeliveryDto.poId} not found`,
      );
    if (po.status === 'CANCELLED') {
      throw new BadRequestException(
        'Cannot deliver against a cancelled purchase order',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: createDeliveryDto.receivedById },
    });
    if (!user)
      throw new NotFoundException(
        `User #${createDeliveryDto.receivedById} not found`,
      );

    const delivery = await this.prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          poId: createDeliveryDto.poId,
          receivedById: createDeliveryDto.receivedById,
          deliveryDate: createDeliveryDto.deliveryDate
            ? new Date(createDeliveryDto.deliveryDate)
            : undefined,
          status: createDeliveryDto.status ?? 'PARTIAL',
          remarks: createDeliveryDto.remarks,
          items: {
            create: createDeliveryDto.items.map((i) => ({
              itemId: i.itemId,
              receivedQty: i.receivedQty,
              condition: i.condition ?? 'GOOD',
              remarks: i.remarks,
            })),
          },
        },
      });

      const orderedById = new Map(po.items.map((it) => [it.itemId, it]));
      for (const line of createDeliveryDto.items) {
        const poi = orderedById.get(line.itemId);
        if (!poi) {
          throw new BadRequestException(
            `Item #${line.itemId} is not part of this purchase order`,
          );
        }
        const newQty = poi.receivedQty + line.receivedQty;
        if (newQty > poi.orderedQty) {
          throw new BadRequestException(
            `Received quantity for item #${line.itemId} exceeds ordered quantity (${poi.orderedQty})`,
          );
        }
        await tx.purchaseOrderItem.update({
          where: { id: poi.id },
          data: { receivedQty: newQty },
        });
      }

      const allItems = await tx.purchaseOrderItem.findMany({
        where: { poId: po.id },
      });
      const fullyReceived = allItems.every(
        (it) => it.receivedQty >= it.orderedQty,
      );
      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { status: fullyReceived ? 'MATERIAL_RECEIVED' : 'PARTIAL' },
      });

      await tx.requirement.updateMany({
        where: {
          id: po.requirementId,
          status: {
            in: ['VENDOR_ASSIGNED', 'WHATSAPP_SENT', 'AWAITING_DELIVERY'],
          },
        },
        data: { status: 'MATERIAL_RECEIVED' },
      });

      return tx.delivery.findUnique({
        where: { id: created.id },
        include: DELIVERY_INCLUDE,
      });
    });

    await this.auditLogsService.log({
      entityType: 'Delivery',
      entityId: delivery!.id,
      action: 'CREATED',
      description: `Delivery recorded against ${po.poNumber} by ${
        user.name ?? `user #${createDeliveryDto.receivedById}`
      }`,
      performedById: createDeliveryDto.receivedById ?? performedById,
    });

    await this.autoRaiseDiscrepancies(createDeliveryDto, delivery!.id, po);
    return delivery;
  }

  private async autoRaiseDiscrepancies(
    dto: CreateDeliveryDto,
    deliveryId: number,
    po: { poNumber: string; items: { itemId: number; orderedQty: number }[] },
  ) {
    const orderedQtyByItem = new Map(
      po.items.map((it) => [it.itemId, it.orderedQty]),
    );
    for (const line of dto.items) {
      const type = CONDITION_TO_DISCREPANCY_TYPE[line.condition ?? 'GOOD'];
      if (!type) continue;
      const shortfall =
        (orderedQtyByItem.get(line.itemId) ?? line.receivedQty) -
        line.receivedQty;
      const quantity =
        type === 'SHORTAGE'
          ? shortfall
          : type === 'DAMAGE'
            ? line.receivedQty
            : null;
      await this.discrepanciesService.create({
        poId: dto.poId,
        deliveryId,
        itemId: line.itemId,
        discrepancyType: type,
        quantity: quantity !== null && quantity > 0 ? quantity : undefined,
        description: `Auto-raised from delivery against ${po.poNumber} (${line.condition})`,
      });
    }
  }

  findAll() {
    return this.prisma.delivery.findMany({
      orderBy: { id: 'desc' },
      include: {
        User: { select: { id: true, name: true } },
        PurchaseOrder: { select: { id: true, poNumber: true, status: true } },
        _count: { select: { items: true, Discrepancy: true } },
      },
    });
  }

  async findOne(id: number) {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id },
      include: DELIVERY_INCLUDE,
    });
    if (!delivery) throw new NotFoundException(`Delivery #${id} not found`);
    return delivery;
  }

  async update(id: number, updateDeliveryDto: UpdateDeliveryDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {
      status: updateDeliveryDto.status,
      remarks: updateDeliveryDto.remarks,
    };
    if (updateDeliveryDto.deliveryDate) {
      data.deliveryDate = new Date(updateDeliveryDto.deliveryDate);
    }
    return this.prisma.delivery.update({
      where: { id },
      data: data,
      include: DELIVERY_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.delivery.delete({ where: { id } });
    return { deleted: true, id };
  }
}
