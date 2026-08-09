import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, registerUser } from './helpers.js';

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

  it('rejects unauthenticated access to protected routes', async () => {
    await request(app.getHttpServer()).get('/api/stores').expect(401);
  });
});
