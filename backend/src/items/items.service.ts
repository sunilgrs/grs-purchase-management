import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwIfForeignKeyViolation } from '../common/prisma-errors.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

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
}
