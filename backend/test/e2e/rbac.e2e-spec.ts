import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  seedTestContext,
  auth,
  TestContext,
} from './helpers.js';

describe('RBAC (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  let reqId: number;
  let poId: number;
  let deliveryId: number;
  let discrepancyId: number;
  let rejectReqId: number;
  let poReqId: number;
  let poReqPoId: number;

  const api = (
    method: string,
    path: string,
    body?: unknown,
    token?: string,
  ) => {
    const r = request(app.getHttpServer())[method](path);
    if (token) r.set(auth(token));
    if (body !== undefined) r.send(body);
    return r;
  };

  const requirementBody = () => ({
    storeId: ctx.storeId,
    requestedById: ctx.storeKeeper.id,
    requiredDate: '2026-09-01',
    priority: 'HIGH',
    items: [{ itemId: ctx.itemAId, quantity: 2 }],
  });

  const approveBody = () => ({
    vendorId: ctx.vendorAId,
    expectedDate: '2026-08-30',
    items: [{ itemId: ctx.itemAId, orderedQty: 2 }],
  });

  const poBody = () => ({
    requirementId: poReqId,
    vendorId: ctx.vendorAId,
    expectedDate: '2026-08-30',
    items: [{ itemId: ctx.itemAId, orderedQty: 2 }],
  });

  const deliveryBody = () => ({
    poId,
    receivedById: ctx.storeKeeper.id,
    status: 'FULL',
    items: [{ itemId: ctx.itemAId, receivedQty: 2, condition: 'GOOD' }],
  });

  const check = async (
    method: string,
    path: string,
    body: unknown,
    token: string,
    want: number,
  ) => {
    const res = await api(method, path, body, token);
    expect(res.status).toBe(want);
  };

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);

    // Advance one requirement to a state where every endpoint can be probed.
    const create = await api(
      'post',
      '/api/requirements',
      requirementBody(),
      ctx.storeKeeper.accessToken,
    ).expect(201);
    reqId = create.body.id;
    await api(
      'post',
      `/api/requirements/${reqId}/submit`,
      {},
      ctx.storeKeeper.accessToken,
    ).expect(201);
    await api(
      'post',
      `/api/requirements/${reqId}/store-manager-review`,
      { approve: true },
      ctx.manager.accessToken,
    ).expect(201);
    const approve = await api(
      'post',
      `/api/requirements/${reqId}/approve`,
      approveBody(),
      ctx.manager.accessToken,
    ).expect(201);
    poId = approve.body.id;
    const delivery = await api(
      'post',
      '/api/deliveries',
      deliveryBody(),
      ctx.storeKeeper.accessToken,
    ).expect(201);
    deliveryId = delivery.body.id;
    const dis = await api(
      'post',
      '/api/discrepancies',
      {
        poId,
        deliveryId,
        itemId: ctx.itemAId,
        discrepancyType: 'SHORTAGE',
        quantity: 1,
      },
      ctx.storeKeeper.accessToken,
    ).expect(201);
    discrepancyId = dis.body.id;

    // Fresh requirement left at SUBMITTED for the reject tests.
    const rejectReq = await api(
      'post',
      '/api/requirements',
      requirementBody(),
      ctx.storeKeeper.accessToken,
    ).expect(201);
    rejectReqId = rejectReq.body.id;
    await api(
      'post',
      `/api/requirements/${rejectReqId}/submit`,
      {},
      ctx.storeKeeper.accessToken,
    ).expect(201);

    // Fresh requirement advanced to PENDING_MANAGER_APPROVAL for the PO tests.
    const poReq = await api(
      'post',
      '/api/requirements',
      requirementBody(),
      ctx.storeKeeper.accessToken,
    ).expect(201);
    poReqId = poReq.body.id;
    await api(
      'post',
      `/api/requirements/${poReqId}/submit`,
      {},
      ctx.storeKeeper.accessToken,
    ).expect(201);
    await api(
      'post',
      `/api/requirements/${poReqId}/store-manager-review`,
      { approve: true },
      ctx.manager.accessToken,
    ).expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Requirement actions', () => {
    it('STORE_KEEPER can create a requirement', async () => {
      await check(
        'post',
        '/api/requirements',
        requirementBody(),
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('MANAGER can create a requirement', async () => {
      await check(
        'post',
        '/api/requirements',
        requirementBody(),
        ctx.manager.accessToken,
        201,
      );
    });
    it('MANAGER can submit a requirement', async () => {
      const created = await api(
        'post',
        '/api/requirements',
        requirementBody(),
        ctx.manager.accessToken,
      ).expect(201);
      await check(
        'post',
        `/api/requirements/${created.body.id}/submit`,
        {},
        ctx.manager.accessToken,
        201,
      );
    });
    it('MANAGER can store-manager-review', async () => {
      const created = await api(
        'post',
        '/api/requirements',
        requirementBody(),
        ctx.manager.accessToken,
      ).expect(201);
      await api(
        'post',
        `/api/requirements/${created.body.id}/submit`,
        {},
        ctx.manager.accessToken,
      ).expect(201);
      await check(
        'post',
        `/api/requirements/${created.body.id}/store-manager-review`,
        { approve: true },
        ctx.manager.accessToken,
        201,
      );
    });
    it('STORE_KEEPER cannot manager-approve', async () => {
      await check(
        'post',
        `/api/requirements/${reqId}/approve`,
        approveBody(),
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('MANAGER can reject', async () => {
      await check(
        'post',
        `/api/requirements/${rejectReqId}/reject`,
        { approve: false },
        ctx.manager.accessToken,
        201,
      );
    });
    it('STORE_KEEPER cannot reject', async () => {
      await check(
        'post',
        `/api/requirements/${rejectReqId}/reject`,
        { approve: false },
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('MANAGER can read whatsapp-message', async () => {
      await check(
        'get',
        `/api/requirements/${reqId}/whatsapp-message`,
        undefined,
        ctx.manager.accessToken,
        200,
      );
    });
    it('STORE_KEEPER cannot read whatsapp-message', async () => {
      await check(
        'get',
        `/api/requirements/${reqId}/whatsapp-message`,
        undefined,
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('STORE_KEEPER cannot mark-whatsapp-sent', async () => {
      await check(
        'post',
        `/api/requirements/${reqId}/mark-whatsapp-sent`,
        {},
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('STORE_KEEPER cannot mark-awaiting-delivery', async () => {
      await check(
        'post',
        `/api/requirements/${reqId}/mark-awaiting-delivery`,
        {},
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('STORE_KEEPER can verify', async () => {
      await check(
        'post',
        `/api/requirements/${reqId}/verify`,
        { approved: true },
        ctx.storeKeeper.accessToken,
        201,
      );
    });
  });

  describe('Purchase order and delivery actions', () => {
    it('MANAGER can create a PO', async () => {
      const res = await api(
        'post',
        '/api/purchase-orders',
        poBody(),
        ctx.manager.accessToken,
      ).expect(201);
      poReqPoId = res.body.id;
    });
    it('STORE_KEEPER cannot create a PO', async () => {
      await check(
        'post',
        '/api/purchase-orders',
        poBody(),
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('MANAGER can record a delivery', async () => {
      await check(
        'post',
        '/api/deliveries',
        { ...deliveryBody(), poId: poReqPoId },
        ctx.manager.accessToken,
        201,
      );
    });
  });

  describe('Discrepancy actions', () => {
    it('STORE_KEEPER can report a discrepancy', async () => {
      await check(
        'post',
        '/api/discrepancies',
        {
          poId,
          deliveryId,
          itemId: ctx.itemAId,
          discrepancyType: 'DAMAGE',
          quantity: 1,
        },
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('MANAGER can report a discrepancy', async () => {
      await check(
        'post',
        '/api/discrepancies',
        {
          poId,
          deliveryId,
          itemId: ctx.itemAId,
          discrepancyType: 'DAMAGE',
          quantity: 1,
        },
        ctx.manager.accessToken,
        201,
      );
    });
    it('STORE_KEEPER can start-review', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/start-review`,
        {},
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('STORE_KEEPER cannot manager-review', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/manager-review`,
        { approve: true },
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('MANAGER can manager-review', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/manager-review`,
        { approve: true },
        ctx.manager.accessToken,
        201,
      );
    });
    it('STORE_KEEPER cannot read discrepancy whatsapp-message', async () => {
      await check(
        'get',
        `/api/discrepancies/${discrepancyId}/whatsapp-message`,
        undefined,
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('STORE_KEEPER can await-replacement', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/await-replacement`,
        {},
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('STORE_KEEPER can replacement-received', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/replacement-received`,
        {},
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('MANAGER can verify-replacement', async () => {
      const dis = await api(
        'post',
        '/api/discrepancies',
        {
          poId,
          deliveryId,
          itemId: ctx.itemAId,
          discrepancyType: 'DAMAGE',
          quantity: 1,
        },
        ctx.storeKeeper.accessToken,
      ).expect(201);
      await api(
        'post',
        `/api/discrepancies/${dis.body.id}/start-review`,
        {},
        ctx.storeKeeper.accessToken,
      ).expect(201);
      await api(
        'post',
        `/api/discrepancies/${dis.body.id}/manager-review`,
        { approve: true },
        ctx.manager.accessToken,
      ).expect(201);
      await api(
        'post',
        `/api/discrepancies/${dis.body.id}/await-replacement`,
        {},
        ctx.storeKeeper.accessToken,
      ).expect(201);
      await api(
        'post',
        `/api/discrepancies/${dis.body.id}/replacement-received`,
        {},
        ctx.storeKeeper.accessToken,
      ).expect(201);
      await check(
        'post',
        `/api/discrepancies/${dis.body.id}/verify`,
        { approved: true },
        ctx.manager.accessToken,
        201,
      );
    });
    it('STORE_KEEPER can verify-replacement', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/verify`,
        { approved: true },
        ctx.storeKeeper.accessToken,
        201,
      );
    });
    it('STORE_KEEPER cannot complete', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/complete`,
        {},
        ctx.storeKeeper.accessToken,
        403,
      );
    });
    it('MANAGER can complete', async () => {
      await check(
        'post',
        `/api/discrepancies/${discrepancyId}/complete`,
        {},
        ctx.manager.accessToken,
        201,
      );
    });
  });
});
