import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { createTestApp, seedTestContext, TestContext } from './helpers.js';

function buildWorkbook(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Vendor bulk import (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  const upload = (
    file?: Buffer | string,
    name = 'vendors.xlsx',
    token?: string,
  ) => {
    const r = request(app.getHttpServer()).post('/api/vendors/import');
    if (token) r.set({ Authorization: `Bearer ${token}` });
    if (Buffer.isBuffer(file)) r.attach('file', file, name);
    return r;
  };

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an upload without a file', async () => {
    const res = await upload(undefined, 'vendors.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Excel file');
  });

  it('rejects a non-Excel extension', async () => {
    const res = await upload(
      buildWorkbook([{ vendorName: 'X1' }]),
      'vendors.txt',
      ctx.admin.accessToken,
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('.xlsx');
  });

  it('rejects an invalid Excel buffer', async () => {
    const res = await upload(
      Buffer.from('this is not an excel file'),
      'vendors.xlsx',
      ctx.admin.accessToken,
    );
    expect(res.status).toBe(400);
  });

  it('forbids store keepers and managers', async () => {
    const file = buildWorkbook([{ vendorName: 'X1' }]);
    expect(
      (await upload(file, 'vendors.xlsx', ctx.storeKeeper.accessToken)).status,
    ).toBe(403);
    expect(
      (await upload(file, 'vendors.xlsx', ctx.manager.accessToken)).status,
    ).toBe(403);
  });

  it('lets an ADMIN import new vendors', async () => {
    const file = buildWorkbook([
      {
        'Vendor Name': 'IMPORT Vendor One',
        'Contact Person': 'Amit',
        Mobile: '9111111111',
        Email: 'one@example.com',
      },
      { vendorName: 'IMPORT Vendor Two', whatsapp: '9222222222' },
    ]);
    const res = await upload(file, 'vendors.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 2, updated: 0, skipped: 0 });
  });

  it('upserts vendors that already exist instead of duplicating', async () => {
    const file = buildWorkbook([
      {
        vendorName: 'IMPORT Vendor One',
        contactPerson: 'Amit Updated',
        active: 'No',
      },
    ]);
    const res = await upload(file, 'vendors.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 0, updated: 1, skipped: 0 });
    const list = await request(app.getHttpServer())
      .get('/api/vendors')
      .set({ Authorization: `Bearer ${ctx.admin.accessToken}` })
      .expect(200);
    const imported = list.body.filter(
      (v: { vendorName: string }) => v.vendorName === 'IMPORT Vendor One',
    );
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      contactPerson: 'Amit Updated',
      active: false,
    });
  });

  it('skips rows missing the vendor name and reports errors', async () => {
    const file = buildWorkbook([
      { vendorName: '', contactPerson: 'No Name' },
      { vendorName: 'IMPORT Vendor Three', mobile: '9333333333' },
    ]);
    const res = await upload(file, 'vendors.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 1, skipped: 1 });
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          message: expect.stringContaining('Vendor Name'),
        }),
      ]),
    );
  });
});
