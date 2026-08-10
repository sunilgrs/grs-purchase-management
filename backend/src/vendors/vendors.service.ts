import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';

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
}
