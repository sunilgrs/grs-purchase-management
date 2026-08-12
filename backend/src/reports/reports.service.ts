import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export const GROUP_BYS = ['month', 'vendor', 'store', 'item'] as const;
export type ReportGroupBy = (typeof GROUP_BYS)[number];

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

interface PoWithLines {
  id: number;
  orderDate: Date;
  Vendor: { vendorName: string } | null;
  Requirement: { Store: { storeName: string } | null } | null;
  items: {
    orderedQty: number;
    unitPrice: number | null;
    Item: { itemName: string } | null;
  }[];
}

export interface SpendRow {
  label: string;
  count: number;
  spend: number;
}

export interface SpendReport {
  groupBy: ReportGroupBy;
  from: string;
  to: string;
  count: number;
  total: number;
  rows: SpendRow[];
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async spend(
    from?: string,
    to?: string,
    rawGroupBy?: string,
  ): Promise<SpendReport> {
    const groupBy: ReportGroupBy = GROUP_BYS.includes(
      rawGroupBy as ReportGroupBy,
    )
      ? (rawGroupBy as ReportGroupBy)
      : 'month';

    const end = this.parseDate(to) ?? new Date();
    const start =
      this.parseDate(from) ??
      new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());

    end.setHours(23, 59, 59, 999);
    start.setHours(0, 0, 0, 0);

    const pos = await this.prisma.purchaseOrder.findMany({
      where: { orderDate: { gte: start, lte: end } },
      select: {
        id: true,
        orderDate: true,
        Vendor: { select: { vendorName: true } },
        Requirement: {
          select: { Store: { select: { storeName: true } } },
        },
        items: {
          select: {
            orderedQty: true,
            unitPrice: true,
            Item: { select: { itemName: true } },
          },
        },
      },
      orderBy: { orderDate: 'asc' },
    });

    const byKey = new Map<
      string,
      { label: string; poIds: Set<number>; spend: number }
    >();
    if (groupBy === 'item') {
      for (const po of pos) {
        for (const line of po.items) {
          const label = line.Item?.itemName ?? 'Unknown';
          let entry = byKey.get(label);
          if (!entry) {
            entry = { label, poIds: new Set(), spend: 0 };
            byKey.set(label, entry);
          }
          entry.poIds.add(po.id);
          entry.spend += (line.unitPrice ?? 0) * line.orderedQty;
        }
      }
    } else {
      for (const po of pos) {
        const key = this.keyFor(po, groupBy);
        let entry = byKey.get(key);
        if (!entry) {
          entry = {
            label: this.labelFor(po, groupBy),
            poIds: new Set(),
            spend: 0,
          };
          byKey.set(key, entry);
        }
        entry.poIds.add(po.id);
        for (const line of po.items) {
          entry.spend += (line.unitPrice ?? 0) * line.orderedQty;
        }
      }
    }

    const rows: SpendRow[] = [...byKey.entries()]
      .map(([, entry]) => ({
        label: entry.label,
        count: entry.poIds.size,
        spend: Math.round(entry.spend),
      }))
      .sort((a, b) => b.spend - a.spend || a.label.localeCompare(b.label));

    const total = rows.reduce((sum, r) => sum + r.spend, 0);
    const count = pos.length;

    return {
      groupBy,
      from: this.formatDate(start),
      to: this.formatDate(end),
      count,
      total,
      rows,
    };
  }

  private keyFor(
    po: PoWithLines,
    groupBy: Exclude<ReportGroupBy, 'item'>,
  ): string {
    switch (groupBy) {
      case 'month': {
        const d = new Date(po.orderDate);
        return `${d.getFullYear()}-${d.getMonth()}`;
      }
      case 'vendor':
        return po.Vendor?.vendorName ?? 'Unknown';
      case 'store':
        return po.Requirement?.Store?.storeName ?? 'Unassigned';
    }
  }

  private labelFor(
    po: PoWithLines,
    groupBy: Exclude<ReportGroupBy, 'item'>,
  ): string {
    switch (groupBy) {
      case 'month': {
        const d = new Date(po.orderDate);
        return `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear()}`;
      }
      case 'vendor':
        return po.Vendor?.vendorName ?? 'Unknown';
      case 'store':
        return po.Requirement?.Store?.storeName ?? 'Unassigned';
    }
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, y, m, d] = match;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
