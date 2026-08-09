import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { throwIfForeignKeyViolation } from '../common/prisma-errors.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({
      where: { name: createCategoryDto.name },
    });
    if (existing)
      throw new ConflictException('A category with this name already exists');
    return this.prisma.category.create({ data: createCategoryDto });
  }

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { id: 'desc' },
      include: { _count: { select: { Item: true } } },
    });
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { Item: { orderBy: { id: 'desc' }, take: 20 } },
    });
    if (!category) throw new NotFoundException(`Category #${id} not found`);
    return category;
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    if (updateCategoryDto.name) {
      const existing = await this.prisma.category.findUnique({
        where: { name: updateCategoryDto.name },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException('A category with this name already exists');
      }
    }
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (err) {
      throwIfForeignKeyViolation(
        err,
        'This category is referenced by items and cannot be deleted.',
      );
    }
    return { deleted: true, id };
  }
}
