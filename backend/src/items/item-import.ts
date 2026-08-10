import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

export interface ImportRow {
  rowNumber: number;
  itemCode: string;
  itemName: string;
  unit?: string;
  categoryName?: string;
  vendorName?: string;
  active?: boolean;
}

const HEADER_ALIASES: Record<string, keyof ImportRow> = {
  itemcode: 'itemCode',
  code: 'itemCode',
  'item code': 'itemCode',
  itemname: 'itemName',
  name: 'itemName',
  'item name': 'itemName',
  unit: 'unit',
  uom: 'unit',
  category: 'categoryName',
  categoryname: 'categoryName',
  vendor: 'vendorName',
  vendorcode: 'vendorName',
  preferredvendor: 'vendorName',
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

export function parseItemExcel(buffer: Buffer): ImportRow[] {
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

  const rows: ImportRow[] = [];
  for (let i = 0; i < rawRows.length; i++) {
    const mapped: Partial<Record<keyof ImportRow, string>> = {};
    for (const [key, value] of Object.entries(rawRows[i])) {
      const field = HEADER_ALIASES[normalizeHeader(key)];
      const text = cellValue(value);
      if (field && text) mapped[field] = text;
    }

    const itemCode = mapped.itemCode ?? '';
    const itemName = mapped.itemName ?? '';
    if (!itemCode && !itemName) continue;

    rows.push({
      rowNumber: i + 2,
      itemCode,
      itemName,
      unit: mapped.unit || undefined,
      categoryName: mapped.categoryName || undefined,
      vendorName: mapped.vendorName || undefined,
      active: parseActive(mapped.active),
    });
  }
  return rows;
}
