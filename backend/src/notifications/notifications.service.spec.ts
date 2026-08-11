import { describe, it, expect, jest } from '@jest/globals';
import { NotificationsService } from './notifications.service.js';

function makeService() {
  const prisma = {
    requirement: {
      findMany: jest.fn(() => [
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
      findMany: jest.fn(() => [
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
      findMany: jest.fn(() => [
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
    const res = await service.findAll('MANAGER');
    expect(prisma.requirement.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.requirement.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'PENDING_MANAGER_APPROVAL' },
      }),
    );
    expect(res.approvals).toEqual([
      expect.objectContaining({ requirementNo: 'REQ-3' }),
    ]);
  });

  it('skips approvals for store keepers', async () => {
    const { service, prisma } = makeService();
    const res = await service.findAll('STORE_KEEPER');
    expect(prisma.requirement.findMany).not.toHaveBeenCalled();
    expect(res.approvals).toEqual([]);
  });

  it('returns in-progress purchase orders and open discrepancies for everyone', async () => {
    const { service, prisma } = makeService();
    const res = await service.findAll('STORE_KEEPER');
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
});
