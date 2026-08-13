import { describe, it, expect, jest } from '@jest/globals';
import { NotificationsService } from './notifications.service.js';

function makeService() {
  const prisma = {
    notificationRead: {
      findUnique: jest.fn(
        (_args: unknown) => null as null | { lastReadAt: Date },
      ),
      upsert: jest.fn((_args: unknown) => null),
    },
    requirement: {
      findMany: jest.fn((_args: unknown) => [
        {
          id: 3,
          requirementNo: 'REQ-3',
          priority: 'HIGH',
          createdAt: '2026-08-11T10:00:00Z',
          requestedBy: { name: 'Ramesh' },
        },
      ]),
    },
    purchaseOrder: {
      findMany: jest.fn((_args: unknown) => [
        {
          id: 2,
          poNumber: 'PO-2',
          expectedDate: '2026-08-20T00:00:00Z',
          status: 'PARTIAL',
          createdAt: '2026-08-10T10:00:00Z',
          Vendor: { vendorName: 'Acme' },
        },
      ]),
    },
    discrepancy: {
      findMany: jest.fn((_args: unknown) => [
        {
          id: 5,
          discrepancyType: 'DAMAGE',
          status: 'ISSUE_RAISED',
          createdAt: '2026-08-09T10:00:00Z',
          Item: { itemName: 'Gloves' },
          PurchaseOrder: { poNumber: 'PO-1' },
        },
      ]),
    },
  };
  const service = new NotificationsService(prisma as never);
  return { service, prisma };
}

describe('NotificationsService', () => {
  it('returns pending approvals for approver roles', async () => {
    const { service, prisma } = makeService();
    const res = await service.findAll(1, 'MANAGER');
    expect(prisma.notificationRead.findUnique).toHaveBeenCalledWith({
      where: { userId: 1 },
      select: { lastReadAt: true },
    });
    expect(prisma.requirement.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING_MANAGER_APPROVAL' },
      }),
    );
    expect(res.approvals).toEqual([
      expect.objectContaining({ requirementNo: 'REQ-3' }),
    ]);
    expect(res.lastReadAt).toBeNull();
  });

  it('reports the saved lastReadAt for the user', async () => {
    const { service, prisma } = makeService();
    prisma.notificationRead.findUnique.mockReturnValue({
      lastReadAt: new Date('2026-08-11T08:00:00Z'),
    });
    const res = await service.findAll(1, 'STORE_KEEPER');
    expect(res.lastReadAt).toBe('2026-08-11T08:00:00.000Z');
  });

  it('skips approvals for store keepers', async () => {
    const { service, prisma } = makeService();
    const res = await service.findAll(1, 'STORE_KEEPER');
    expect(prisma.requirement.findMany).not.toHaveBeenCalled();
    expect(res.approvals).toEqual([]);
  });

  it('returns in-progress purchase orders and open discrepancies for everyone', async () => {
    const { service, prisma } = makeService();
    const res = await service.findAll(1, 'STORE_KEEPER');
    expect(prisma.purchaseOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
      }),
    );
    expect(prisma.discrepancy.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { notIn: ['COMPLETED', 'REJECTED'] } },
      }),
    );
    expect(res.deliveries).toEqual([
      expect.objectContaining({ poNumber: 'PO-2' }),
    ]);
    expect(res.discrepancies).toEqual([
      expect.objectContaining({ discrepancyType: 'DAMAGE' }),
    ]);
  });

  it('marks all notifications read for the user', async () => {
    const { service, prisma } = makeService();
    const res = await service.markAllRead(7);
    expect(prisma.notificationRead.upsert).toHaveBeenCalledWith({
      where: { userId: 7 },
      create: { userId: 7, lastReadAt: expect.any(Date) },
      update: { lastReadAt: expect.any(Date) },
    });
    expect(res.lastReadAt).toEqual(expect.any(String));
  });
});
