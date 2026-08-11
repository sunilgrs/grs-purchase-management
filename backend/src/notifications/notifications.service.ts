import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const APPROVAL_ROLES = new Set(['MANAGER', 'PURCHASER', 'ADMIN']);

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(role: string) {
    const includeApprovals = APPROVAL_ROLES.has(role);

    const [approvals, deliveries, discrepancies] = await Promise.all([
      includeApprovals
        ? this.prisma.requirement.findMany({
            where: { status: 'PENDING_MANAGER_APPROVAL' },
            orderBy: { id: 'desc' },
            take: 8,
            select: {
              id: true,
              requirementNo: true,
              priority: true,
              createdAt: true,
              requestedBy: { select: { name: true } },
            },
          })
        : Promise.resolve([]),
      this.prisma.purchaseOrder.findMany({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        orderBy: { id: 'desc' },
        take: 8,
        select: {
          id: true,
          poNumber: true,
          expectedDate: true,
          status: true,
          createdAt: true,
          Vendor: { select: { vendorName: true } },
        },
      }),
      this.prisma.discrepancy.findMany({
        where: { status: { notIn: ['COMPLETED', 'REJECTED'] } },
        orderBy: { id: 'desc' },
        take: 8,
        select: {
          id: true,
          discrepancyType: true,
          status: true,
          createdAt: true,
          Item: { select: { itemName: true } },
          PurchaseOrder: { select: { poNumber: true } },
        },
      }),
    ]);

    return { approvals, deliveries, discrepancies };
  }
}
