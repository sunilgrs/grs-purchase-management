import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

const USER_OMIT = { password: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { mobile: createUserDto.mobile },
          { email: createUserDto.email ?? '' },
        ],
      },
    });
    if (existing)
      throw new ConflictException(
        'A user with this mobile or email already exists',
      );

    const password = await bcrypt.hash(createUserDto.password, 10);
    return this.prisma.user.create({
      data: {
        name: createUserDto.name,
        mobile: createUserDto.mobile,
        email: createUserDto.email ?? null,
        password,
        role: createUserDto.role ?? 'STORE_KEEPER',
        status: createUserDto.status ?? 'ACTIVE',
      },
      omit: USER_OMIT,
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      omit: USER_OMIT,
      orderBy: { id: 'desc' },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: USER_OMIT,
      include: {
        _count: {
          select: {
            requestedRequirements: true,
            approvedRequirements: true,
            Delivery: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...updateUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    } else {
      delete data.password;
    }

    return this.prisma.user.update({
      where: { id },
      data: data,
      omit: USER_OMIT,
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
    return { deleted: true, id };
  }
}
