import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  seedTestContext,
  auth,
  TestContext,
} from './helpers.js';

describe('Notifications (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  it('starts with no read timestamp and exposes the payload shape', async () => {
    const res = await server()
      .get('/api/notifications')
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    expect(res.body.lastReadAt).toBeNull();
    expect(res.body).toHaveProperty('approvals');
    expect(res.body).toHaveProperty('deliveries');
    expect(res.body).toHaveProperty('discrepancies');
  });

  it('marks all notifications read for the current user only', async () => {
    const marked = await server()
      .post('/api/notifications/read')
      .set(auth(ctx.manager.accessToken))
      .send({})
      .expect(201);
    expect(marked.body.lastReadAt).toEqual(expect.any(String));

    const managerRes = await server()
      .get('/api/notifications')
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    expect(managerRes.body.lastReadAt).toBe(marked.body.lastReadAt);

    const keeperRes = await server()
      .get('/api/notifications')
      .set(auth(ctx.storeKeeper.accessToken))
      .expect(200);
    expect(keeperRes.body.lastReadAt).toBeNull();
  });

  it('rejects an anonymous mark-all-read', async () => {
    await server().post('/api/notifications/read').send({}).expect(401);
  });
});
