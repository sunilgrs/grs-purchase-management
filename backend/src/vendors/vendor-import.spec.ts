import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { parseVendorExcel } from './vendor-import.js';

function buildWorkbook(rows: Record<string, unknown>[]): Buffer {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

describe('parseVendorExcel', () => {
  it('maps friendly headers into import rows', () => {
    const buf = buildWorkbook([
      { 'Vendor Name': 'Acme Supplies', Contact: 'Ravi', Mobile: '9876543210' },
      {
        vendorName: 'Beta Traders',
        contactPerson: 'Sita',
        mobile: '9123456789',
      },
    ]);
    const rows = parseVendorExcel(buf);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      vendorName: 'Acme Supplies',
      contactPerson: 'Ravi',
      mobile: '9876543210',
    });
    expect(rows[1]).toMatchObject({
      vendorName: 'Beta Traders',
      contactPerson: 'Sita',
      mobile: '9123456789',
    });
  });

  it('parses contact details and address', () => {
    const buf = buildWorkbook([
      {
        Vendor: 'Gamma Co',
        'Contact Person': 'John',
        Phone: '9000000000',
        WhatsApp: '9000000000',
        Email: 'gamma@example.com',
        Address: '12 Main Road, Chennai',
      },
    ]);
    const rows = parseVendorExcel(buf);
    expect(rows[0]).toMatchObject({
      vendorName: 'Gamma Co',
      contactPerson: 'John',
      mobile: '9000000000',
      whatsapp: '9000000000',
      email: 'gamma@example.com',
      address: '12 Main Road, Chennai',
    });
  });

  it('accepts common active synonyms', () => {
    const buf = buildWorkbook([
      { vendorName: 'A', active: 'Yes' },
      { vendorName: 'B', status: '0' },
      { vendorName: 'C', Active: 'ENABLED' },
      { vendorName: 'D' },
    ]);
    const rows = parseVendorExcel(buf);
    expect(rows[0].active).toBe(true);
    expect(rows[1].active).toBe(false);
    expect(rows[2].active).toBe(true);
    expect(rows[3].active).toBeUndefined();
  });

  it('skips fully empty rows', () => {
    const buf = buildWorkbook([{ vendorName: 'A' }, {}, { vendorName: 'B' }]);
    const rows = parseVendorExcel(buf);
    expect(rows).toHaveLength(2);
  });

  it('throws a 400 on a non-Excel buffer', () => {
    expect(() => parseVendorExcel(Buffer.from('not an excel file'))).toThrow(
      BadRequestException,
    );
  });

  it('returns an empty array for a header-only workbook', () => {
    const buf = buildWorkbook([{ vendorName: '' }]);
    expect(parseVendorExcel(buf)).toEqual([]);
  });
});
