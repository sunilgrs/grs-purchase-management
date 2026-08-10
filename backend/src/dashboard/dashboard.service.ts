import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [
      vendors,
      items,
      users,
      requirements,
      purchaseOrders,
      deliveries,
      discrepancies,
      recentPos,
    ] = await Promise.all([
      this.prisma.vendor.count(),
      this.prisma.item.count(),
      this.prisma.user.count(),
      this.prisma.requirement.count(),
      this.prisma.purchaseOrder.count(),
      this.prisma.delivery.count(),
      this.prisma.discrepancy.count(),
      this.prisma.purchaseOrder.findMany({
        orderBy: { id: 'desc' },
        take: 6,
        select: {
          id: true,
          poNumber: true,
          expectedDate: true,
          status: true,
          Vendor: { select: { vendorName: true } },
          Requirement: { select: { requirementNo: true } },
        },
      }),
    ]);

    const [openRequirements, inProgressPos, openDiscrepancies] =
      await Promise.all([
        this.prisma.requirement.count({
          where: { status: { notIn: ['COMPLETED', 'REJECTED'] } },
        }),
        this.prisma.purchaseOrder.count({
          where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
        }),
        this.prisma.discrepancy.count({
          where: { status: { notIn: ['COMPLETED', 'REJECTED'] } },
        }),
      ]);

    return {
      vendors,
      items,
      users,
      requirements,
      openRequirements,
      purchaseOrders,
      inProgressPos,
      deliveries,
      discrepancies,
      openDiscrepancies,
      recentPos,
    };
  }
}
