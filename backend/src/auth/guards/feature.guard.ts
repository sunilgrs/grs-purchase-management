import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { roleDefaultFeatures } from '../../common/role-defaults.js';
import { FEATURE_KEY, Feature } from '../decorators/feature.decorator.js';

const ADMIN_UNRESTRICTED_FEATURES = new Set<string>(['users', 'settings']);

@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<Feature[]>(
      FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredFeatures || requiredFeatures.length === 0) return true;

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: { id: number; role: string } }>();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // Admins can always manage users/settings so they can never lock
    // themselves (or others) out of user management.
    if (
      user.role === 'ADMIN' &&
      requiredFeatures.some((f) => ADMIN_UNRESTRICTED_FEATURES.has(f))
    ) {
      return true;
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { permissions: true, role: true },
    });
    if (!dbUser) {
      throw new UnauthorizedException('Account no longer exists');
    }

    // null permissions = role defaults (restricted per role)
    if (dbUser.permissions === null) {
      const defaults = roleDefaultFeatures(dbUser.role);
      if (requiredFeatures.every((f) => defaults.includes(f))) return true;
      throw new ForbiddenException('Access to this feature is not permitted');
    }

    let granted: string[];
    try {
      granted = JSON.parse(dbUser.permissions) as string[];
    } catch {
      granted = [];
    }

    if (requiredFeatures.every((f) => granted.includes(f))) return true;

    throw new ForbiddenException('Access to this feature is not permitted');
  }
}
