import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as XLSX from 'xlsx';
import { createTestApp, seedTestContext, TestContext } from './helpers.js';

function buildWorkbook(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('Item bulk import (e2e)', () => {
  let app: INestApplication;
  let ctx: TestContext;

  const upload = (
    file: Buffer | string,
    name = 'items.xlsx',
    token?: string,
  ) => {
    const r = request(app.getHttpServer()).post('/api/items/import');
    if (token) r.set({ Authorization: `Bearer ${token}` });
    if (Buffer.isBuffer(file)) r.attach('file', file, name);
    return r;
  };

  beforeAll(async () => {
    app = await createTestApp();
    ctx = await seedTestContext(app);
    await ctx.prisma.category.create({
      data: { name: 'Cement Products' },
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects an upload without a file', async () => {
    const res = await upload(undefined, 'items.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Excel file');
  });

  it('rejects a non-Excel extension', async () => {
    const res = await upload(
      buildWorkbook([{ itemCode: 'X1', itemName: 'X' }]),
      'items.txt',
      ctx.admin.accessToken,
    );
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('.xlsx');
  });

  it('rejects an invalid Excel buffer', async () => {
    const res = await upload(
      Buffer.from('this is not an excel file'),
      'items.xlsx',
      ctx.admin.accessToken,
    );
    expect(res.status).toBe(400);
  });

  it('forbids store keepers and purchasers', async () => {
    const file = buildWorkbook([
      { itemCode: 'X1', itemName: 'X', Unit: 'pcs' },
    ]);
    expect(
      (await upload(file, 'items.xlsx', ctx.storeKeeper.accessToken)).status,
    ).toBe(403);
    expect(
      (await upload(file, 'items.xlsx', ctx.purchaser.accessToken)).status,
    ).toBe(403);
  });

  it('lets a manager import new items', async () => {
    const file = buildWorkbook([
      {
        itemCode: 'IMPORT-001',
        itemName: 'Cement 50kg',
        Unit: 'bag',
        Category: 'Cement Products',
      },
      { itemCode: 'IMPORT-002', itemName: 'Steel Rod', Unit: 'ton' },
    ]);
    const res = await upload(file, 'items.xlsx', ctx.manager.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 2, updated: 0, skipped: 0 });
  });

  it('upserts items that already exist instead of duplicating', async () => {
    const file = buildWorkbook([
      {
        itemCode: 'IMPORT-001',
        itemName: 'Cement 50kg',
        Unit: 'bag',
        Active: 'No',
      },
    ]);
    const res = await upload(file, 'items.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 0, updated: 1, skipped: 0 });
    const list = await request(app.getHttpServer())
      .get('/api/items')
      .set({ Authorization: `Bearer ${ctx.admin.accessToken}` })
      .expect(200);
    const imported = list.body.filter(
      (i: { itemCode: string }) => i.itemCode === 'IMPORT-001',
    );
    expect(imported).toHaveLength(1);
    expect(imported[0]).toMatchObject({
      itemName: 'Cement 50kg',
      active: false,
    });
  });

  it('skips rows with unknown category or vendor and reports errors', async () => {
    const file = buildWorkbook([
      {
        itemCode: 'IMPORT-003',
        itemName: 'Nails',
        Unit: 'kg',
        Category: 'Unknown Cat',
      },
      {
        itemCode: 'IMPORT-004',
        itemName: 'Screws',
        Unit: 'kg',
        Vendor: 'Unknown Vendor',
      },
      {
        itemCode: 'IMPORT-005',
        itemName: 'Bolts',
        Unit: 'kg',
        Vendor: 'E2E Vendor A',
      },
    ]);
    const res = await upload(file, 'items.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 1, updated: 0, skipped: 2 });
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          message: expect.stringContaining('Unknown Cat'),
        }),
        expect.objectContaining({
          row: 3,
          message: expect.stringContaining('Unknown Vendor'),
        }),
      ]),
    );
  });

  it('skips rows missing required fields', async () => {
    const file = buildWorkbook([
      { itemCode: '', itemName: 'No Code' },
      { itemCode: 'IMPORT-006', itemName: '' },
      { itemCode: 'IMPORT-007', itemName: 'Good', Unit: 'pcs' },
    ]);
    const res = await upload(file, 'items.xlsx', ctx.admin.accessToken);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ created: 1, skipped: 2 });
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          row: 2,
          message: expect.stringContaining('Item Code'),
        }),
        expect.objectContaining({
          row: 3,
          message: expect.stringContaining('Item Name'),
        }),
      ]),
    );
  });
});
