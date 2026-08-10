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

  async analytics() {
    const [statusGroups, discrepancyGroups, priorityGroups, pos] =
      await Promise.all([
        this.prisma.purchaseOrder.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.discrepancy.groupBy({
          by: ['discrepancyType'],
          _count: { _all: true },
        }),
        this.prisma.requirement.groupBy({
          by: ['priority'],
          _count: { _all: true },
        }),
        this.prisma.purchaseOrder.findMany({
          select: {
            id: true,
            orderDate: true,
            Vendor: { select: { vendorName: true } },
            items: {
              select: {
                orderedQty: true,
                unitPrice: true,
                Item: { select: { itemName: true } },
              },
            },
          },
        }),
      ]);

    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString('en', { month: 'short' }),
      });
    }

    const spendByMonth = new Map<string, number>();
    const vendorSpend = new Map<string, number>();
    const itemSpend = new Map<string, number>();
    for (const po of pos) {
      const monthKey = (() => {
        const d = new Date(po.orderDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      })();
      for (const line of po.items) {
        const amount = (line.unitPrice ?? 0) * line.orderedQty;
        spendByMonth.set(monthKey, (spendByMonth.get(monthKey) ?? 0) + amount);
        const vendorName = po.Vendor?.vendorName ?? 'Unknown';
        vendorSpend.set(
          vendorName,
          (vendorSpend.get(vendorName) ?? 0) + amount,
        );
        const itemName = line.Item?.itemName ?? 'Unknown';
        itemSpend.set(itemName, (itemSpend.get(itemName) ?? 0) + amount);
      }
    }

    const spendTrend = months.map((m) => ({
      month: m.label,
      spend: Math.round(spendByMonth.get(m.key) ?? 0),
    }));

    const topVendors = [...vendorSpend.entries()]
      .filter(([, spend]) => spend > 0)
      .map(([vendorName, spend]) => ({ vendorName, spend: Math.round(spend) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    const topItems = [...itemSpend.entries()]
      .filter(([, spend]) => spend > 0)
      .map(([itemName, spend]) => ({ itemName, spend: Math.round(spend) }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 5);

    return {
      spendTrend,
      poStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count._all,
      })),
      discrepancyTypes: discrepancyGroups.map((g) => ({
        type: g.discrepancyType,
        count: g._count._all,
      })),
      priorityCounts: priorityGroups.map((g) => ({
        priority: g.priority,
        count: g._count._all,
      })),
      topVendors,
      topItems,
    };
  }
}
