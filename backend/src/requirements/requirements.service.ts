import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service.js';
import { CreateRequirementDto } from './dto/create-requirement.dto.js';
import { UpdateRequirementDto } from './dto/update-requirement.dto.js';
import {
  AssignVendorDto,
  ReviewRequirementDto,
  VerifyRequirementDto,
} from './dto/actions.dto.js';
import { sequentialNumber } from '../common/doc-number.js';
import { assertTransition } from '../common/status.js';
import {
  buildRequirementMessage,
  buildWhatsAppLink,
  WHATSAPP_FORMATS,
} from '../common/whatsapp.js';
const REQUIREMENT_INCLUDE = {
  Store: true,
  requestedBy: { select: { id: true, name: true, mobile: true, email: true } },
  approvedBy: { select: { id: true, name: true, mobile: true, email: true } },
  items: {
    include: {
      Item: {
        include: { Category: true },
      },
    },
  },
} as const;

@Injectable()
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  async create(createRequirementDto: CreateRequirementDto) {
    await this.ensureReference('store', createRequirementDto.storeId);
    await this.ensureReference('user', createRequirementDto.requestedById);

    const count = await this.prisma.requirement.count();
    const requirementNo = sequentialNumber('REQ', count);

    const requirement = await this.prisma.requirement.create({
      data: {
        requirementNo,
        storeId: createRequirementDto.storeId,
        requestedById: createRequirementDto.requestedById,
        requiredDate: new Date(createRequirementDto.requiredDate),
        priority: createRequirementDto.priority ?? 'NORMAL',
        status: 'DRAFT',
        remarks: createRequirementDto.remarks,
        items: {
          create: createRequirementDto.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        },
      },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: requirement.id,
      action: 'CREATED',
      description: `Requirement ${requirementNo} created in draft`,
      performedById: createRequirementDto.requestedById,
    });

    return requirement;
  }

  findAll() {
    return this.prisma.requirement.findMany({
      orderBy: { id: 'desc' },
      include: {
        ...REQUIREMENT_INCLUDE,
        _count: { select: { items: true, PurchaseOrder: true } },
      },
    });
  }

  async findOne(id: number) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id },
      include: REQUIREMENT_INCLUDE,
    });
    if (!requirement)
      throw new NotFoundException(`Requirement #${id} not found`);
    return requirement;
  }

  async update(id: number, updateRequirementDto: UpdateRequirementDto) {
    await this.findOne(id);

    if (updateRequirementDto.storeId) {
      await this.ensureReference('store', updateRequirementDto.storeId);
    }
    if (updateRequirementDto.requestedById) {
      await this.ensureReference('user', updateRequirementDto.requestedById);
    }

    const data: Record<string, unknown> = {
      storeId: updateRequirementDto.storeId,
      requestedById: updateRequirementDto.requestedById,
      priority: updateRequirementDto.priority,
      status: updateRequirementDto.status,
      approvedById: updateRequirementDto.approvedById,
      remarks: updateRequirementDto.remarks,
    };
    if (updateRequirementDto.requiredDate) {
      data.requiredDate = new Date(updateRequirementDto.requiredDate);
    }

    return this.prisma.$transaction(async (tx) => {
      if (updateRequirementDto.items) {
        await tx.requirementItem.deleteMany({ where: { requirementId: id } });
        data.items = {
          create: updateRequirementDto.items.map((i) => ({
            itemId: i.itemId,
            quantity: i.quantity,
          })),
        };
      }
      return tx.requirement.update({
        where: { id },
        data: data,
        include: REQUIREMENT_INCLUDE,
      });
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.requirement.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ---------------------------------------------------------------- workflow

  async submit(id: number, performedById?: number | null) {
    const req = await this.findOne(id);
    assertTransition(req.status, ['DRAFT', 'SUBMITTED', 'REJECTED'], 'submit');

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'SUBMITTED' },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'SUBMITTED',
      description: `Requirement ${req.requirementNo} submitted for store manager approval`,
      performedById,
    });

    return updated;
  }

  async storeManagerReview(
    id: number,
    dto: ReviewRequirementDto,
    performedById?: number | null,
  ) {
    const req = await this.findOne(id);
    assertTransition(
      req.status,
      ['SUBMITTED', 'PENDING_STORE_MANAGER_APPROVAL'],
      'review as store manager',
    );

    const next = dto.approve ? 'PENDING_MANAGER_APPROVAL' : 'REJECTED';
    const updated = await this.prisma.requirement.update({
      where: { id },
      data: {
        status: next,
        remarks: dto.remarks ?? req.remarks,
      },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: dto.approve ? 'STORE_MANAGER_APPROVED' : 'STORE_MANAGER_REJECTED',
      description: `Requirement ${req.requirementNo} ${
        dto.approve ? 'approved by store manager' : 'rejected by store manager'
      }${dto.remarks ? `: ${dto.remarks}` : ''}`,
      performedById,
    });

    return updated;
  }

  async managerApprove(
    id: number,
    dto: AssignVendorDto,
    performedById?: number | null,
  ) {
    const req = await this.findOne(id);
    assertTransition(
      req.status,
      [
        'PENDING_MANAGER_APPROVAL',
        'PENDING_STORE_MANAGER_APPROVAL',
        'SUBMITTED',
      ],
      'approve and assign vendor',
    );

    const po = await this.purchaseOrdersService.create(
      {
        requirementId: id,
        vendorId: dto.vendorId,
        expectedDate: dto.expectedDate,
        notes: dto.notes,
        items: dto.items,
      },
      performedById,
    );

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'MANAGER_APPROVED',
      description: `Requirement ${req.requirementNo} approved by manager, vendor assigned (${po?.poNumber})`,
      performedById,
    });

    return po;
  }

  async managerReject(
    id: number,
    dto: ReviewRequirementDto,
    performedById?: number | null,
  ) {
    const req = await this.findOne(id);
    assertTransition(
      req.status,
      [
        'PENDING_MANAGER_APPROVAL',
        'PENDING_STORE_MANAGER_APPROVAL',
        'SUBMITTED',
      ],
      'reject as manager',
    );

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'REJECTED', remarks: dto.remarks ?? req.remarks },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'MANAGER_REJECTED',
      description: `Requirement ${req.requirementNo} rejected by manager${
        dto.remarks ? `: ${dto.remarks}` : ''
      }`,
      performedById,
    });

    return updated;
  }

  async markWhatsAppSent(id: number, performedById?: number | null) {
    const req = await this.findOne(id);
    assertTransition(req.status, ['VENDOR_ASSIGNED'], 'mark WhatsApp as sent');

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'WHATSAPP_SENT' },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'WHATSAPP_SENT',
      description: `Order details sent to vendor on WhatsApp for requirement ${req.requirementNo}`,
      performedById,
    });

    return updated;
  }

  async markAwaitingDelivery(id: number, performedById?: number | null) {
    const req = await this.findOne(id);
    assertTransition(
      req.status,
      ['WHATSAPP_SENT', 'VENDOR_ASSIGNED'],
      'mark awaiting delivery',
    );

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'AWAITING_DELIVERY' },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'AWAITING_DELIVERY',
      description: `Requirement ${req.requirementNo} marked as awaiting delivery`,
      performedById,
    });

    return updated;
  }

  async startVerification(id: number, performedById?: number | null) {
    const req = await this.findOne(id);
    assertTransition(req.status, ['MATERIAL_RECEIVED'], 'start verification');

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: 'VERIFICATION_PENDING' },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: 'VERIFICATION_STARTED',
      description: `Verification started for requirement ${req.requirementNo}`,
      performedById,
    });

    return updated;
  }

  async verify(
    id: number,
    dto: VerifyRequirementDto,
    performedById?: number | null,
  ) {
    const req = await this.findOne(id);
    assertTransition(
      req.status,
      ['MATERIAL_RECEIVED', 'VERIFICATION_PENDING'],
      'verify',
    );

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { requirementId: id },
      select: { id: true },
    });
    const openDiscrepancies =
      pos.length === 0
        ? 0
        : await this.prisma.discrepancy.count({
            where: {
              poId: { in: pos.map((p) => p.id) },
              status: { notIn: ['COMPLETED', 'REJECTED'] },
            },
          });

    let next: string;
    if (dto.approved && openDiscrepancies === 0) {
      next = 'COMPLETED';
    } else if (dto.approved && openDiscrepancies > 0) {
      next = 'VERIFICATION_PENDING';
    } else {
      next = 'VERIFICATION_PENDING';
    }

    const updated = await this.prisma.requirement.update({
      where: { id },
      data: { status: next },
      include: REQUIREMENT_INCLUDE,
    });

    await this.auditLogsService.log({
      entityType: 'Requirement',
      entityId: id,
      action: dto.approved ? 'VERIFIED' : 'DIFFERENCE_FOUND',
      description: dto.approved
        ? openDiscrepancies > 0
          ? `Requirement ${req.requirementNo} verified, pending ${openDiscrepancies} open issue(s)`
          : `Requirement ${req.requirementNo} verified and completed`
        : `Difference found during verification of requirement ${req.requirementNo}`,
      performedById,
    });

    if (next === 'COMPLETED') {
      await this.prisma.purchaseOrder.updateMany({
        where: { requirementId: id },
        data: { status: 'COMPLETED' },
      });
    }

    return updated;
  }

  async whatsappMessage(id: number) {
    const req = await this.findOne(id);

    const po = await this.prisma.purchaseOrder.findFirst({
      where: { requirementId: id },
      orderBy: { id: 'desc' },
      include: {
        Vendor: true,
        items: {
          include: {
            Item: { select: { id: true, itemName: true, unit: true } },
          },
        },
      },
    });

    if (!po || !po.Vendor) {
      throw new BadRequestException(
        'No vendor has been assigned to this requirement yet',
      );
    }

    const data = {
      vendor: po.Vendor.vendorName,
      poNumber: po.poNumber,
      requirementNo: req.requirementNo,
      expectedDate: po.expectedDate,
      items: po.items.map((it) => ({
        itemName: it.Item?.itemName ?? `Item #${it.itemId}`,
        orderedQty: it.orderedQty,
        unit: it.Item?.unit,
        unitPrice: it.unitPrice,
      })),
    };

    const formats = WHATSAPP_FORMATS.map((f) => {
      const message = buildRequirementMessage(data, f.id);
      return {
        id: f.id,
        label: f.label,
        message,
        waLink: buildWhatsAppLink(message, po.Vendor.mobile),
      };
    });

    return {
      formats,
      message: formats[0].message,
      waLink: formats[0].waLink,
      mobile: po.Vendor.mobile,
      vendor: po.Vendor.vendorName,
      poNumber: po.poNumber,
      expectedDate: po.expectedDate,
    };
  }

  private async ensureReference(model: 'store' | 'user', id: number) {
    const found =
      model === 'store'
        ? await this.prisma.store.findUnique({ where: { id } })
        : await this.prisma.user.findUnique({ where: { id } });
    if (!found) throw new BadRequestException(`${model} #${id} does not exist`);
  }
}
