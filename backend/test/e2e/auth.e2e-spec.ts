import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, registerUser, auth } from './helpers.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user and returns a JWT', async () => {
    const user = await registerUser(app, {
      name: 'Auth Tester',
      mobile: '9199999999',
      email: 'auth-tester@test.example',
      password: 'secret123',
      role: 'MANAGER',
    });
    expect(user.id).toBeGreaterThan(0);
    expect(user.role).toBe('MANAGER');
    expect(user.accessToken).toBeTruthy();
  });

  it('logs in with the registered credentials', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'auth-tester@test.example', password: 'secret123' })
      .expect(201);
    expect(res.body.accessToken).toBeTruthy();
  });

  it('rejects a bad password with 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'auth-tester@test.example', password: 'wrong-pass' })
      .expect(401);
  });

  it('rejects duplicate registration with 409', async () => {
    await registerUser(app, {
      name: 'Duplicate',
      mobile: '9199999998',
      email: 'dup@test.example',
      password: 'secret123',
    });
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ name: 'Duplicate', mobile: '9199999998', password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('rejects self-registration as ADMIN', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        name: 'Wannabe Admin',
        mobile: '9199999997',
        email: 'wannabe@test.example',
        password: 'secret123',
        role: 'ADMIN',
      });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated access to protected routes', async () => {
    await request(app.getHttpServer()).get('/api/stores').expect(401);
  });

  it('serves a public health endpoint', async () => {
    const res = await request(app.getHttpServer()).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Password reset (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  it('lets an admin reset a user password and sign in with the temporary one', async () => {
    const admin = await registerUser(app, {
      name: 'Reset Admin',
      mobile: '9199900001',
      email: 'reset-admin@test.example',
      password: 'adminsecret',
    });
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: 'ADMIN' },
    });
    const adminLogin = await server()
      .post('/api/auth/login')
      .send({ username: 'reset-admin@test.example', password: 'adminsecret' })
      .expect(201);
    admin.accessToken = adminLogin.body.accessToken;

    const target = await registerUser(app, {
      name: 'Reset Target',
      mobile: '9199900002',
      email: 'reset-target@test.example',
      password: 'oldsecret',
      role: 'STORE_KEEPER',
    });

    const res = await server()
      .post(`/api/users/${target.id}/reset-password`)
      .set(auth(admin.accessToken))
      .expect(201);
    expect(res.body.temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(res.body.id).toBe(target.id);

    // Old password no longer works, temporary one does
    await server()
      .post('/api/auth/login')
      .send({ username: 'reset-target@test.example', password: 'oldsecret' })
      .expect(401);
    const login = await server()
      .post('/api/auth/login')
      .send({
        username: 'reset-target@test.example',
        password: res.body.temporaryPassword,
      })
      .expect(201);
    expect(login.body.accessToken).toBeTruthy();

    // The reset is recorded in the audit log
    const logs = await server()
      .get('/api/audit-logs')
      .set(auth(admin.accessToken))
      .expect(200);
    expect(
      logs.body.some(
        (l: { action: string; entityId: string }) =>
          l.action === 'PASSWORD_RESET' && l.entityId === String(target.id),
      ),
    ).toBe(true);
  });

  it('blocks non-admins from resetting passwords', async () => {
    const manager = await registerUser(app, {
      name: 'Reset Manager',
      mobile: '9199900003',
      email: 'reset-manager@test.example',
      password: 'secret123',
      role: 'MANAGER',
    });
    const target = await registerUser(app, {
      name: 'Reset Target 2',
      mobile: '9199900004',
      email: 'reset-target2@test.example',
      password: 'secret123',
    });
    await server()
      .post(`/api/users/${target.id}/reset-password`)
      .set(auth(manager.accessToken))
      .expect(403);
  });

  it('lets a user change their own password', async () => {
    const user = await registerUser(app, {
      name: 'Change Me',
      mobile: '9199900005',
      email: 'change-me@test.example',
      password: 'current123',
      role: 'STORE_KEEPER',
    });

    await server()
      .patch('/api/auth/password')
      .set(auth(user.accessToken))
      .send({ currentPassword: 'wrong', newPassword: 'newsecret123' })
      .expect(401);

    await server()
      .patch('/api/auth/password')
      .set(auth(user.accessToken))
      .send({ currentPassword: 'current123', newPassword: 'newsecret123' })
      .expect(200);

    await server()
      .post('/api/auth/login')
      .send({ username: 'change-me@test.example', password: 'current123' })
      .expect(401);
    const login = await server()
      .post('/api/auth/login')
      .send({ username: 'change-me@test.example', password: 'newsecret123' })
      .expect(201);
    expect(login.body.accessToken).toBeTruthy();
  });

  it('rejects a new password shorter than 6 characters', async () => {
    const user = await registerUser(app, {
      name: 'Short Pass',
      mobile: '9199900006',
      email: 'short-pass@test.example',
      password: 'current123',
    });
    await server()
      .patch('/api/auth/password')
      .set(auth(user.accessToken))
      .send({ currentPassword: 'current123', newPassword: 'abc' })
      .expect(400);
  });

  it('requires authentication for the password endpoint', async () => {
    await server()
      .patch('/api/auth/password')
      .send({ currentPassword: 'x', newPassword: 'newsecret123' })
      .expect(401);
  });
});
