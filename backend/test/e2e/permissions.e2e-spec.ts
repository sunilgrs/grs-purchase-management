import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  seedTestContext,
  auth,
  TestContext,
} from './helpers.js';

describe('Feature permissions (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists users without permissions when unset', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/users')
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    const manager = res.body.find(
      (u: { id: number }) => u.id === ctx.manager.id,
    );
    expect(manager.permissions).toBeNull();
  });

  it('only ADMIN can change a users permissions', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.manager.id}/permissions`)
      .set(auth(ctx.manager.accessToken))
      .send({ permissions: ['dashboard'] })
      .expect(403);
  });

  it('rejects unknown permission keys', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.manager.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: ['billing'] })
      .expect(400);
  });

  it('requires a permissions field', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.manager.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({})
      .expect(400);
  });

  it('sets permissions and returns them to the next login', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.manager.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: ['requirements', 'items'] })
      .expect(200);

    const login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'e2e-manager@test.example',
        password: 'secret123',
      })
      .expect(201);
    expect(login.body.permissions).toEqual(['requirements', 'items']);
  });

  it('allows access to granted features', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/requirements')
      .set(auth(ctx.manager.accessToken))
      .expect(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('blocks access to features that were not granted', async () => {
    await request(app.getHttpServer())
      .get('/api/vendors')
      .set(auth(ctx.manager.accessToken))
      .expect(403);
  });

  it('blocks the dashboard summary when dashboard is not granted', async () => {
    await request(app.getHttpServer())
      .get('/api/dashboard/summary')
      .set(auth(ctx.manager.accessToken))
      .expect(403);
  });

  it('resets to defaults (null) to restore full access', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.manager.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: null })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/vendors')
      .set(auth(ctx.manager.accessToken))
      .expect(200);
  });

  it('keeps ADMIN access to /users even when restricted elsewhere', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.admin.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: ['dashboard'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/users')
      .set(auth(ctx.admin.accessToken))
      .expect(200);

    // restore admin defaults
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.admin.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: null })
      .expect(200);
  });

  it('ADMIN is still blocked from features without users/settings bypass', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.admin.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: ['dashboard'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/vendors')
      .set(auth(ctx.admin.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.admin.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: null })
      .expect(200);
  });

  it('supports a restricted STORE_KEEPER (requirements only)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.storeKeeper.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: ['requirements'] })
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/requirements')
      .set(auth(ctx.storeKeeper.accessToken))
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/items')
      .set(auth(ctx.storeKeeper.accessToken))
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/audit-logs')
      .set(auth(ctx.storeKeeper.accessToken))
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/api/users/${ctx.storeKeeper.id}/permissions`)
      .set(auth(ctx.admin.accessToken))
      .send({ permissions: null })
      .expect(200);
  });
});
