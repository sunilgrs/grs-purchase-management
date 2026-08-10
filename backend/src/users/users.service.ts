import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdatePermissionsDto } from './dto/update-permissions.dto.js';
import { FEATURES } from '../auth/decorators/feature.decorator.js';
import { deserializePermissions } from '../common/permissions.js';

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
    const user = await this.prisma.user.create({
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
    return this.withPermissions(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      omit: USER_OMIT,
      orderBy: { id: 'desc' },
    });
    return users.map((user) => this.withPermissions(user));
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
    return this.withPermissions(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.findOne(id);

    const data: Record<string, unknown> = { ...updateUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password as string, 10);
    } else {
      delete data.password;
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: data,
      omit: USER_OMIT,
    });
    return this.withPermissions(user);
  }

  async remove(id: number) {
    await this.findOne(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      omit: USER_OMIT,
    });
    return this.withPermissions(user);
  }

  async updatePermissions(id: number, dto: UpdatePermissionsDto) {
    await this.findOne(id);

    if (dto.permissions === undefined) {
      throw new BadRequestException(
        'permissions is required (send null to reset to defaults)',
      );
    }
    const invalid = (dto.permissions ?? []).filter(
      (p) => !(FEATURES as readonly string[]).includes(p),
    );
    if (invalid.length > 0) {
      throw new BadRequestException(
        `Unknown permissions: ${invalid.join(', ')}`,
      );
    }

    const permissions =
      dto.permissions === null
        ? null
        : JSON.stringify([...new Set(dto.permissions)]);

    const user = await this.prisma.user.update({
      where: { id },
      data: { permissions },
      omit: USER_OMIT,
    });
    return this.withPermissions(user);
  }

  private withPermissions(
    user: { permissions: string | null } & Record<string, unknown>,
  ) {
    return { ...user, permissions: deserializePermissions(user.permissions) };
  }
}
