import { describe, it, expect, jest } from '@jest/globals';
import { ReportsService } from './reports.service.js';

function makeService(rows: unknown[]) {
  const prisma = {
    purchaseOrder: {
      findMany: jest.fn((_args: unknown) => rows),
    },
  };
  const service = new ReportsService(prisma as never);
  return { service, prisma };
}

const SAMPLE_POS = [
  {
    id: 1,
    orderDate: new Date('2026-07-10T00:00:00Z'),
    Vendor: { vendorName: 'Acme Supplies' },
    Requirement: { Store: { storeName: 'Main Store' } },
    items: [
      { orderedQty: 10, unitPrice: 100, Item: { itemName: 'Gloves' } },
      { orderedQty: 2, unitPrice: 500, Item: { itemName: 'Helmet' } },
    ],
  },
  {
    id: 2,
    orderDate: new Date('2026-07-20T00:00:00Z'),
    Vendor: { vendorName: 'Bolt Ltd' },
    Requirement: { Store: { storeName: 'Main Store' } },
    items: [{ orderedQty: 4, unitPrice: 50, Item: { itemName: 'Gloves' } }],
  },
];

describe('ReportsService', () => {
  it('groups spend by month by default and sorts by spend desc', async () => {
    const { service, prisma } = makeService(SAMPLE_POS);
    const res = await service.spend(undefined, undefined, undefined);
    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          orderDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        },
      }),
    );
    expect(res.groupBy).toBe('month');
    expect(res.rows).toEqual([{ label: 'Jul 2026', count: 2, spend: 2200 }]);
    expect(res.total).toBe(2200);
    expect(res.count).toBe(2);
  });

  it('groups spend by vendor', async () => {
    const { service } = makeService(SAMPLE_POS);
    const res = await service.spend(undefined, undefined, 'vendor');
    expect(res.rows).toEqual([
      { label: 'Acme Supplies', count: 1, spend: 2000 },
      { label: 'Bolt Ltd', count: 1, spend: 200 },
    ]);
  });

  it('groups spend by store', async () => {
    const { service } = makeService(SAMPLE_POS);
    const res = await service.spend(undefined, undefined, 'store');
    expect(res.rows).toEqual([{ label: 'Main Store', count: 2, spend: 2200 }]);
  });

  it('groups spend by item across line items', async () => {
    const { service } = makeService(SAMPLE_POS);
    const res = await service.spend(undefined, undefined, 'item');
    expect(res.rows).toEqual([
      { label: 'Gloves', count: 2, spend: 1200 },
      { label: 'Helmet', count: 1, spend: 1000 },
    ]);
  });

  it('falls back to month for an unknown groupBy', async () => {
    const { service } = makeService(SAMPLE_POS);
    const res = await service.spend(undefined, undefined, 'bogus');
    expect(res.groupBy).toBe('month');
  });

  it('passes the requested date range to the query', async () => {
    const { service, prisma } = makeService(SAMPLE_POS);
    await service.spend('2026-07-01', '2026-07-31', 'vendor');
    const call = prisma.purchaseOrder.findMany.mock.calls[0][0] as {
      where: { orderDate: { gte: Date; lte: Date } };
    };
    const gte = call.where.orderDate.gte;
    const lte = call.where.orderDate.lte;
    expect(gte.getFullYear()).toBe(2026);
    expect(gte.getMonth()).toBe(6);
    expect(gte.getDate()).toBe(1);
    expect(lte.getFullYear()).toBe(2026);
    expect(lte.getMonth()).toBe(6);
    expect(lte.getDate()).toBe(31);
    expect(lte.getHours()).toBe(23);
  });

  it('handles orders with missing relations and null prices', async () => {
    const { service } = makeService([
      {
        id: 9,
        orderDate: new Date('2026-07-05T00:00:00Z'),
        Vendor: null,
        Requirement: null,
        items: [{ orderedQty: 3, unitPrice: null, Item: null }],
      },
    ]);
    const res = await service.spend(undefined, undefined, 'vendor');
    expect(res.rows).toEqual([{ label: 'Unknown', count: 1, spend: 0 }]);
  });

  it('returns an empty report when there are no orders', async () => {
    const { service } = makeService([]);
    const res = await service.spend(undefined, undefined, 'vendor');
    expect(res.rows).toEqual([]);
    expect(res.total).toBe(0);
    expect(res.count).toBe(0);
  });
});
