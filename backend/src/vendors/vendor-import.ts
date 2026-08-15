import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface VendorImportRow {
  rowNumber: number;
  vendorName: string;
  contactPerson?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  active?: boolean;
}

const HEADER_ALIASES: Record<string, keyof VendorImportRow> = {
  vendor: 'vendorName',
  vendorname: 'vendorName',
  name: 'vendorName',
  'vendor name': 'vendorName',
  contact: 'contactPerson',
  contactperson: 'contactPerson',
  'contact person': 'contactPerson',
  mobile: 'mobile',
  phone: 'mobile',
  whatsapp: 'whatsapp',
  email: 'email',
  address: 'address',
  active: 'active',
  status: 'active',
};

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function cellValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number')
    return Number.isNaN(value) ? '' : String(value);
  if (typeof value === 'boolean') return String(value);
  return '';
}

function parseActive(value: unknown): boolean | undefined {
  const v = cellValue(value).toLowerCase();
  if (!v) return undefined;
  if (['1', 'true', 'yes', 'y', 'active', 'enable', 'enabled'].includes(v))
    return true;
  if (['0', 'false', 'no', 'n', 'inactive', 'disable', 'disabled'].includes(v))
    return false;
  return undefined;
}

export function parseVendorExcel(buffer: Buffer): VendorImportRow[] {
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b;
  const isOle =
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0;
  if (!isZip && !isOle) {
    throw new BadRequestException(
      'The uploaded file is not a valid Excel file',
    );
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: 'buffer' });
  } catch {
    throw new BadRequestException(
      'The uploaded file is not a valid Excel file',
    );
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
  });

  const rows: VendorImportRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const mapped: Partial<Record<keyof VendorImportRow, string>> = {};
    for (const [key, value] of Object.entries(rawRows[i])) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      const text = cellValue(value);
      if (field && text) mapped[field] = text;
    }

    const vendorName = mapped.vendorName ?? '';
    if (Object.keys(mapped).length === 0) continue;

    rows.push({
      rowNumber: i + 2,
      vendorName,
      contactPerson: mapped.contactPerson || undefined,
      mobile: mapped.mobile || undefined,
      whatsapp: mapped.whatsapp || undefined,
      email: mapped.email || undefined,
      address: mapped.address || undefined,
      active: parseActive(mapped.active),
    });
  }
  return rows;
}
