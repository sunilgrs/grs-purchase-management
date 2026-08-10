import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwIfForeignKeyViolation } from '../common/prisma-errors.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { parseItemExcel } from './item-import.js';

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
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createItemDto: CreateItemDto) {
    const existing = await this.prisma.item.findUnique({
      where: { itemCode: createItemDto.itemCode },
    });
    if (existing)
      throw new ConflictException('An item with this code already exists');
    return this.prisma.item.create({ data: createItemDto });
  }

  findAll() {
    return this.prisma.item.findMany({
      orderBy: { id: 'desc' },
      include: {
        Category: true,
        Vendor: { select: { id: true, vendorName: true } },
      },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.item.findUnique({
      where: { id },
      include: {
        Category: true,
        Vendor: { select: { id: true, vendorName: true } },
      },
    });
    if (!item) throw new NotFoundException(`Item #${id} not found`);
    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto) {
    await this.findOne(id);
    if (updateItemDto.itemCode) {
      const existing = await this.prisma.item.findUnique({
        where: { itemCode: updateItemDto.itemCode },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('An item with this code already exists');
      }
    }
    return this.prisma.item.update({ where: { id }, data: updateItemDto });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await this.prisma.item.delete({ where: { id } });
    } catch (err) {
      throwIfForeignKeyViolation(
        err,
        'This item is referenced by requirements, purchase orders or deliveries and cannot be deleted.',
      );
    }
    return { deleted: true, id };
  }

  async importFromExcel(buffer: Buffer): Promise<ImportResult> {
    const rows = parseItemExcel(buffer);
    if (rows.length === 0) {
      throw new BadRequestException(
        'No data rows found. Use the first row for headers: Item Code, Item Name, Unit, Category, Vendor, Active.',
      );
    }

    const categories = await this.prisma.category.findMany({
      select: { id: true, name: true },
    });
    const vendors = await this.prisma.vendor.findMany({
      select: { id: true, vendorName: true },
    });
    const categoryIdByName = new Map(
      categories.map((c) => [c.name.toLowerCase(), c.id]),
    );
    const vendorIdByName = new Map(
      vendors.map((v) => [v.vendorName.toLowerCase(), v.id]),
    );

    const errors: ImportError[] = [];
    const toImport: CreateItemDto[] = [];
    for (const row of rows) {
      if (!row.itemCode) {
        errors.push({ row: row.rowNumber, message: 'Item Code is required' });
        continue;
      }
      if (!row.itemName) {
        errors.push({ row: row.rowNumber, message: 'Item Name is required' });
        continue;
      }
      let categoryId: number | undefined;
      if (row.categoryName) {
        categoryId = categoryIdByName.get(row.categoryName.toLowerCase());
        if (categoryId === undefined) {
          errors.push({
            row: row.rowNumber,
            message: `Category "${row.categoryName}" not found`,
          });
          continue;
        }
      }
      let preferredVendorId: number | undefined;
      if (row.vendorName) {
        preferredVendorId = vendorIdByName.get(row.vendorName.toLowerCase());
        if (preferredVendorId === undefined) {
          errors.push({
            row: row.rowNumber,
            message: `Vendor "${row.vendorName}" not found`,
          });
          continue;
        }
      }
      toImport.push({
        itemCode: row.itemCode,
        itemName: row.itemName,
        unit: row.unit || 'Nos',
        categoryId,
        preferredVendorId,
        active: row.active ?? true,
      });
    }

    let created = 0;
    let updated = 0;
    for (const dto of toImport) {
      const existing = await this.prisma.item.findUnique({
        where: { itemCode: dto.itemCode },
      });
      if (existing) {
        await this.prisma.item.update({
          where: { id: existing.id },
          data: dto,
        });
        updated++;
      } else {
        await this.prisma.item.create({ data: dto });
        created++;
      }
    }

    return { created, updated, skipped: errors.length, errors };
  }
}
