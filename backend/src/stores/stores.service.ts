import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwIfForeignKeyViolation } from '../common/prisma-errors.js';
import { CreateStoreDto } from './dto/create-store.dto.js';
import { UpdateStoreDto } from './dto/update-store.dto.js';

@Injectable()
export class StoresService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStoreDto: CreateStoreDto) {
    const existing = await this.prisma.store.findUnique({
      where: { storeName: createStoreDto.storeName },
    });
    if (existing)
      throw new ConflictException('A store with this name already exists');
    return this.prisma.store.create({ data: createStoreDto });
  }

  findAll() {
    return this.prisma.store.findMany({
      orderBy: { id: 'desc' },
      include: { _count: { select: { Requirement: true } } },
    });
  }

  async findOne(id: number) {
    const store = await this.prisma.store.findUnique({
      where: { id },
      include: { _count: { select: { Requirement: true } } },
    });
    if (!store) throw new NotFoundException(`Store #${id} not found`);
    return store;
  }

  async update(id: number, updateStoreDto: UpdateStoreDto) {
    await this.findOne(id);
    if (updateStoreDto.storeName) {
      const existing = await this.prisma.store.findUnique({
        where: { storeName: updateStoreDto.storeName },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A store with this name already exists');
      }
    }
    return this.prisma.store.update({ where: { id }, data: updateStoreDto });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await this.prisma.store.delete({ where: { id } });
    } catch (err) {
      throwIfForeignKeyViolation(
        err,
        'This store is referenced by requirements and cannot be deleted.',
      );
    }
    return { deleted: true, id };
  }
}
