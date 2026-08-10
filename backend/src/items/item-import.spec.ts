import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { parseItemExcel } from './item-import.js';

function buildWorkbook(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Items');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseItemExcel', () => {
  it('maps friendly headers into import rows', () => {
    const buf = buildWorkbook([
      { 'Item Code': 'ITM-001', 'Item Name': 'Cement', Unit: 'bag' },
      { itemCode: 'ITM-002', itemName: 'Steel', unit: 'ton', active: 'no' },
    ]);
    const rows = parseItemExcel(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      itemCode: 'ITM-001',
      itemName: 'Cement',
      unit: 'bag',
    });
    expect(rows[1]).toMatchObject({
      itemCode: 'ITM-002',
      itemName: 'Steel',
      unit: 'ton',
      active: false,
    });
  });

  it('parses category and vendor names', () => {
    const buf = buildWorkbook([
      {
        itemCode: 'ITM-003',
        itemName: 'Pipes',
        category: 'Plumbing',
        vendor: 'Acme Supplies',
      },
    ]);
    const rows = parseItemExcel(buf);
    expect(rows[0]).toMatchObject({
      categoryName: 'Plumbing',
      vendorName: 'Acme Supplies',
    });
  });

  it('accepts common active synonyms', () => {
    const buf = buildWorkbook([
      { itemCode: 'A1', itemName: 'A', active: 'Yes' },
      { itemCode: 'A2', itemName: 'B', active: '0' },
      { itemCode: 'A3', itemName: 'C', active: 'ENABLED' },
      { itemCode: 'A4', itemName: 'D', active: '' },
    ]);
    const rows = parseItemExcel(buf);
    expect(rows[0].active).toBe(true);
    expect(rows[1].active).toBe(false);
    expect(rows[2].active).toBe(true);
    expect(rows[3].active).toBeUndefined();
  });

  it('skips fully empty rows', () => {
    const buf = buildWorkbook([
      { itemCode: 'A1', itemName: 'A', unit: 'pcs' },
      {},
      { itemCode: 'A2', itemName: 'B', unit: 'pcs' },
    ]);
    const rows = parseItemExcel(buf);
    expect(rows).toHaveLength(2);
  });

  it('keeps a row missing itemName (validation happens later)', () => {
    const buf = buildWorkbook([{ itemCode: 'A1', itemName: '', unit: 'pcs' }]);
    const rows = parseItemExcel(buf);
    expect(rows).toHaveLength(1);
    expect(rows[0].itemName).toBe('');
  });

  it('throws a 400 on a non-Excel buffer', () => {
    expect(() => parseItemExcel(Buffer.from('not an excel file'))).toThrow(
      BadRequestException,
    );
  });

  it('returns an empty array for a header-only workbook', () => {
    const buf = buildWorkbook([{ itemCode: '', itemName: '', unit: '' }]);
    expect(parseItemExcel(buf)).toEqual([]);
  });
});
