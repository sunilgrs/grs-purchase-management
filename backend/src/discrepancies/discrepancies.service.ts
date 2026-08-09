import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CreateDiscrepancyDto } from './dto/create-discrepancy.dto.js';
import { UpdateDiscrepancyDto } from './dto/update-discrepancy.dto.js';
import {
  DiscrepancyReviewDto,
  VerifyDiscrepancyDto,
} from './dto/actions.dto.js';
import { assertTransition } from '../common/status.js';
import { buildWhatsAppLink } from '../common/whatsapp.js';

const DISCREPANCY_INCLUDE = {
  Item: { select: { id: true, itemCode: true, itemName: true, unit: true } },
  Delivery: { select: { id: true, deliveryDate: true, status: true } },
  PurchaseOrder: {
    select: { id: true, poNumber: true, status: true, requirementId: true },
  },
} as const;

@Injectable()
export class DiscrepanciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(createDiscrepancyDto: CreateDiscrepancyDto) {
    const deliveryItem = await this.prisma.deliveryItem.findFirst({
      where: {
        deliveryId: createDiscrepancyDto.deliveryId,
        itemId: createDiscrepancyDto.itemId,
      },
    });
    if (!deliveryItem) {
      throw new BadRequestException(
        `Item #${createDiscrepancyDto.itemId} was not part of delivery #${createDiscrepancyDto.deliveryId}`,
      );
    }

    const discrepancy = await this.prisma.discrepancy.create({
      data: {
        poId: createDiscrepancyDto.poId,
        deliveryId: createDiscrepancyDto.deliveryId,
        itemId: createDiscrepancyDto.itemId,
        discrepancyType: createDiscrepancyDto.discrepancyType,
        quantity: createDiscrepancyDto.quantity ?? null,
        description: createDiscrepancyDto.description ?? null,
        photo: createDiscrepancyDto.photo ?? null,
        status: 'ISSUE_RAISED',
      },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: discrepancy.id,
      action: 'ISSUE_RAISED',
      description: `Issue ${createDiscrepancyDto.discrepancyType} raised on ${discrepancy.PurchaseOrder?.poNumber ?? `PO #${createDiscrepancyDto.poId}`}`,
      performedById: null,
    });

    return discrepancy;
  }

  findAll() {
    return this.prisma.discrepancy.findMany({
      orderBy: { id: 'desc' },
      include: DISCREPANCY_INCLUDE,
    });
  }

  async findOne(id: number) {
    const discrepancy = await this.prisma.discrepancy.findUnique({
      where: { id },
      include: DISCREPANCY_INCLUDE,
    });
    if (!discrepancy)
      throw new NotFoundException(`Discrepancy #${id} not found`);
    return discrepancy;
  }

  async update(id: number, updateDiscrepancyDto: UpdateDiscrepancyDto) {
    await this.findOne(id);
    const data: Record<string, unknown> = {
      discrepancyType: updateDiscrepancyDto.discrepancyType,
      quantity: updateDiscrepancyDto.quantity,
      description: updateDiscrepancyDto.description,
      photo: updateDiscrepancyDto.photo,
      status: updateDiscrepancyDto.status,
    };
    return this.prisma.discrepancy.update({
      where: { id },
      data: data,
      include: DISCREPANCY_INCLUDE,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.discrepancy.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ---------------------------------------------------------------- workflow

  async startReview(id: number, performedById?: number | null) {
    const d = await this.findOne(id);
    assertTransition(d.status, ['ISSUE_RAISED'], 'start review');

    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: 'MANAGER_REVIEW' },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: 'MANAGER_REVIEW',
      description: `Issue on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`} moved to manager review`,
      performedById,
    });

    return updated;
  }

  async managerReview(
    id: number,
    dto: DiscrepancyReviewDto,
    performedById?: number | null,
  ) {
    const d = await this.findOne(id);
    assertTransition(
      d.status,
      ['ISSUE_RAISED', 'MANAGER_REVIEW'],
      'review as manager',
    );

    const next = dto.approve ? 'VENDOR_NOTIFIED' : 'REJECTED';
    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: next },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: dto.approve ? 'VENDOR_NOTIFIED' : 'REJECTED',
      description: `Issue on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`} ${
        dto.approve ? 'approved, vendor to be notified' : 'rejected by manager'
      }${dto.remarks ? `: ${dto.remarks}` : ''}`,
      performedById,
    });

    return updated;
  }

  async awaitReplacement(id: number, performedById?: number | null) {
    const d = await this.findOne(id);
    assertTransition(
      d.status,
      ['VENDOR_NOTIFIED'],
      'mark awaiting replacement',
    );

    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: 'REPLACEMENT_AWAITED' },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: 'REPLACEMENT_AWAITED',
      description: `Replacement awaited for issue on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`}`,
      performedById,
    });

    return updated;
  }

  async replacementReceived(id: number, performedById?: number | null) {
    const d = await this.findOne(id);
    assertTransition(
      d.status,
      ['REPLACEMENT_AWAITED'],
      'mark replacement received',
    );

    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: 'REPLACEMENT_RECEIVED' },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: 'REPLACEMENT_RECEIVED',
      description: `Replacement received for issue on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`}`,
      performedById,
    });

    return updated;
  }

  async verify(
    id: number,
    dto: VerifyDiscrepancyDto,
    performedById?: number | null,
  ) {
    const d = await this.findOne(id);
    assertTransition(d.status, ['REPLACEMENT_RECEIVED'], 'verify replacement');

    const next = dto.approved ? 'VERIFIED' : 'ISSUE_RAISED';
    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: next },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: dto.approved ? 'VERIFIED' : 'ISSUE_RAISED',
      description: dto.approved
        ? `Replacement verified for issue on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`}`
        : `Replacement failed verification on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`}, issue reopened`,
      performedById,
    });

    return updated;
  }

  async complete(id: number, performedById?: number | null) {
    const d = await this.findOne(id);
    assertTransition(d.status, ['VERIFIED'], 'complete issue');

    const updated = await this.prisma.discrepancy.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: DISCREPANCY_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Discrepancy',
      entityId: id,
      action: 'COMPLETED',
      description: `Issue resolved on ${d.PurchaseOrder?.poNumber ?? `PO #${d.poId}`}`,
      performedById,
    });

    return updated;
  }

  async whatsappMessage(id: number) {
    const d = await this.findOne(id);

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: d.poId },
      include: { Vendor: true },
    });
    if (!po?.Vendor) {
      throw new BadRequestException(
        'No vendor is linked to this purchase order',
      );
    }

    const message = [
      `Dear ${po.Vendor.vendorName},`,
      '',
      `We received delivery against PO ${po.poNumber}, but there is an issue with the following item:`,
      '',
      `Item: ${d.Item?.itemName ?? `Item #${d.itemId}`}`,
      `Issue: ${d.discrepancyType}${d.quantity != null ? ` (qty ${d.quantity})` : ''}`,
      d.description ? `Details: ${d.description}` : null,
      '',
      'Please arrange a replacement at the earliest.',
      '',
      'Thank you.',
      'GRS IPS Purchase Management',
    ]
      .filter((line) => line !== null)
      .join('\n');

    return {
      message,
      waLink: buildWhatsAppLink(message, po.Vendor.mobile),
      mobile: po.Vendor.mobile,
      vendor: po.Vendor.vendorName,
      poNumber: po.poNumber,
    };
  }
}
