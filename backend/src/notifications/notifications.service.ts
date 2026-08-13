import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

const APPROVAL_ROLES = new Set(['STORE_MANAGER', 'MANAGER', 'ADMIN']);

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: number, role: string) {
    const includeApprovals = APPROVAL_ROLES.has(role);

    const [lastRead, approvals, deliveries, discrepancies] = await Promise.all([
      this.prisma.notificationRead.findUnique({
        where: { userId },
        select: { lastReadAt: true },
      }),
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

    return {
      lastReadAt: lastRead?.lastReadAt.toISOString() ?? null,
      approvals,
      deliveries,
      discrepancies,
    };
  }

  async markAllRead(userId: number) {
    const lastReadAt = new Date();
    await this.prisma.notificationRead.upsert({
      where: { userId },
      create: { userId, lastReadAt },
      update: { lastReadAt },
    });
    return { lastReadAt: lastReadAt.toISOString() };
  }
}
