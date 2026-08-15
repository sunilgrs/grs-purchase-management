import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { parseVendorExcel } from './vendor-import.js';

export interface ImportError {
  row: number;
  message: string;
}

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createVendorDto: CreateVendorDto) {
    const existing = await this.prisma.vendor.findUnique({
      where: { vendorName: createVendorDto.vendorName },
    });
    if (existing)
      throw new ConflictException('A vendor with this name already exists');
    return this.prisma.vendor.create({ data: createVendorDto });
  }

  findAll() {
    return this.prisma.vendor.findMany({
      orderBy: { id: 'desc' },
      include: { _count: { select: { Item: true, PurchaseOrder: true } } },
    });
  }

  async findOne(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        Item: { orderBy: { id: 'desc' }, take: 20 },
        PurchaseOrder: { orderBy: { id: 'desc' }, take: 20 },
      },
    });
    if (!vendor) throw new NotFoundException(`Vendor #${id} not found`);
    return vendor;
  }

  async update(id: number, updateVendorDto: UpdateVendorDto) {
    await this.findOne(id);
    if (updateVendorDto.vendorName) {
      const existing = await this.prisma.vendor.findUnique({
        where: { vendorName: updateVendorDto.vendorName },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A vendor with this name already exists');
      }
    }
    return this.prisma.vendor.update({ where: { id }, data: updateVendorDto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.vendor.update({
      where: { id },
      data: { active: false },
    });
  }

  async importFromExcel(buffer: Buffer): Promise<ImportResult> {
    const rows = parseVendorExcel(buffer);
    if (rows.length === 0) {
      throw new BadRequestException(
        'No data rows found. Use the first row for headers: Vendor Name, Contact Person, Mobile, WhatsApp, Email, Address, Active.',
      );
    }

    const errors: ImportError[] = [];
    const toImport: CreateVendorDto[] = [];
    for (const row of rows) {
      if (!row.vendorName) {
        errors.push({ row: row.rowNumber, message: 'Vendor Name is required' });
        continue;
      }
      toImport.push({
        vendorName: row.vendorName,
        contactPerson: row.contactPerson,
        mobile: row.mobile,
        whatsapp: row.whatsapp,
        email: row.email,
        address: row.address,
        active: row.active ?? true,
      });
    }

    let created = 0;
    let updated = 0;
    for (const dto of toImport) {
      const existing = await this.prisma.vendor.findUnique({
        where: { vendorName: dto.vendorName },
      });
      if (existing) {
        await this.prisma.vendor.update({
          where: { id: existing.id },
          data: dto,
        });
        updated++;
      } else {
        await this.prisma.vendor.create({ data: dto });
        created++;
      }
    }

    return { created, updated, skipped: errors.length, errors };
  }
}
