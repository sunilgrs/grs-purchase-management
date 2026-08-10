import { describe, it, expect, jest } from '@jest/globals';
import { DashboardService } from './dashboard.service.js';

function makeService() {
  const prisma = {
    purchaseOrder: {
      groupBy: jest.fn(() => [
        { status: 'PENDING', _count: { _all: 2 } },
        { status: 'COMPLETED', _count: { _all: 1 } },
      ]),
      findMany: jest.fn(() => [
        {
          id: 1,
          orderDate: '2026-08-10T00:00:00Z',
          Vendor: { vendorName: 'Acme Traders' },
          items: [
            { orderedQty: 10, unitPrice: 100, Item: { itemName: 'Cement' } },
            { orderedQty: 5, unitPrice: 200, Item: { itemName: 'Steel' } },
          ],
        },
        {
          id: 2,
          orderDate: '2026-07-01T00:00:00Z',
          Vendor: { vendorName: 'Acme Traders' },
          items: [
            { orderedQty: 4, unitPrice: null, Item: { itemName: 'Paint' } },
          ],
        },
      ]),
    },
    discrepancy: {
      groupBy: jest.fn(() => [
        { discrepancyType: 'DAMAGED', _count: { _all: 1 } },
      ]),
    },
    requirement: {
      groupBy: jest.fn(() => [{ priority: 'HIGH', _count: { _all: 3 } }]),
    },
  };
  const service = new DashboardService(prisma as never);
  return { service, prisma };
}

describe('DashboardService', () => {
  it('aggregates PO status counts', async () => {
    const { service, prisma } = makeService();
    const res = await service.analytics();
    expect(prisma.purchaseOrder.groupBy).toHaveBeenCalledWith({
      by: ['status'],
      _count: { _all: true },
    });
    expect(res.poStatus).toEqual([
      { status: 'PENDING', count: 2 },
      { status: 'COMPLETED', count: 1 },
    ]);
  });

  it('aggregates discrepancy types and requirement priorities', async () => {
    const { service } = makeService();
    const res = await service.analytics();
    expect(res.discrepancyTypes).toEqual([{ type: 'DAMAGED', count: 1 }]);
    expect(res.priorityCounts).toEqual([{ priority: 'HIGH', count: 3 }]);
  });

  it('computes spend trend over the last six months, filling empty months with zero', async () => {
    const { service } = makeService();
    const res = await service.analytics();
    expect(res.spendTrend).toHaveLength(6);
    const current = new Date();
    const label = current.toLocaleString('en', { month: 'short' });
    const currentBucket = res.spendTrend.find((m) => m.month === label);
    expect(currentBucket).toBeDefined();
    expect(currentBucket.spend).toBe(2000);
    expect(res.spendTrend.filter((m) => m.spend === 0).length).toBeGreaterThan(
      0,
    );
  });

  it('ranks top vendors and items by spend, skipping unknown amounts', async () => {
    const { service } = makeService();
    const res = await service.analytics();
    expect(res.topVendors).toEqual([
      { vendorName: 'Acme Traders', spend: 2000 },
    ]);
    expect(res.topItems).toEqual([
      { itemName: 'Cement', spend: 1000 },
      { itemName: 'Steel', spend: 1000 },
    ]);
  });
});
