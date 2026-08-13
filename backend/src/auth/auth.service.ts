import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { PUBLIC_REGISTER_ROLES, RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { deserializePermissions } from '../common/permissions.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async register(dto: RegisterDto) {
    if (dto.role && !PUBLIC_REGISTER_ROLES.includes(dto.role)) {
      throw new ForbiddenException(
        'You can only self-register as STORE_KEEPER',
      );
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ mobile: dto.mobile }, { email: dto.email ?? '' }],
      },
    });
    if (existing) {
      throw new ConflictException(
        'A user with this mobile or email already exists',
      );
    }

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        mobile: dto.mobile,
        email: dto.email ?? null,
        password,
        role: dto.role ?? 'STORE_KEEPER',
      },
      omit: { password: true },
    });

    return { ...user, accessToken: this.sign(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ mobile: dto.username }, { email: dto.username }] },
    });
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const sanitized = { ...user };
    delete (sanitized as { password?: string }).password;
    return {
      ...sanitized,
      permissions: deserializePermissions(
        (user as { permissions?: string | null }).permissions ?? null,
      ),
      accessToken: this.sign(user),
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Current password is incorrect');

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const password = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password },
    });

    await this.auditLogsService.log({
      entityType: 'USER',
      entityId: userId,
      action: 'PASSWORD_CHANGED',
      description: 'Password changed by the user',
      performedById: userId,
    });

    return { ok: true };
  }

  private sign(user: {
    id: number;
    role: string;
    name: string;
    mobile: string;
  }) {
    return this.jwtService.sign({
      sub: user.id,
      role: user.role,
      name: user.name,
      mobile: user.mobile,
    });
  }
}
