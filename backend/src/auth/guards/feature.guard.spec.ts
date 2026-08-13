import { describe, it, expect, jest } from '@jest/globals';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { FeatureGuard } from './feature.guard.js';

function makeGuard(options: {
  feature?: string[] | null;
  permissions?: string | null;
  role?: string;
  user?: { id: number; role: string } | null;
}) {
  const {
    feature = ['requirements'],
    permissions = null,
    role = 'STORE_KEEPER',
    user,
  } = options;
  const requestUser = user === undefined ? { id: 1, role } : user;
  const reflector = {
    getAllAndOverride: jest.fn(() =>
      feature && feature.length > 0 ? feature : undefined,
    ),
  };
  const prisma = {
    user: {
      findUnique: jest.fn(() => Promise.resolve({ permissions, role })),
    },
  };
  const guard = new FeatureGuard(reflector as never, prisma as never);
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user: requestUser }),
    }),
  } as never;
  return { guard, context, reflector, prisma };
}

describe('FeatureGuard', () => {
  it('allows requests that do not declare a feature', async () => {
    const { guard, context, prisma } = makeGuard({ feature: null });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('rejects requests without an authenticated user', async () => {
    const { guard, context } = makeGuard({ user: null });
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('allows a STORE_KEEPER with no explicit permissions on default features', async () => {
    const { guard, context, prisma } = makeGuard({
      permissions: null,
      role: 'STORE_KEEPER',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { permissions: true, role: true },
    });
  });

  it('rejects a STORE_KEEPER with no explicit permissions on a non-default feature', async () => {
    const { guard, context } = makeGuard({
      feature: ['audit-logs'],
      permissions: null,
      role: 'STORE_KEEPER',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows a STORE_MANAGER with no explicit permissions on default features', async () => {
    const { guard, context } = makeGuard({
      feature: ['deliveries'],
      permissions: null,
      role: 'STORE_MANAGER',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a STORE_MANAGER with no explicit permissions on a non-default feature', async () => {
    const { guard, context } = makeGuard({
      feature: ['audit-logs'],
      permissions: null,
      role: 'STORE_MANAGER',
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows a MANAGER with no explicit permissions on every feature', async () => {
    const { guard, context } = makeGuard({
      feature: ['audit-logs'],
      permissions: null,
      role: 'MANAGER',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a MANAGER with no explicit permissions on default features', async () => {
    const { guard, context } = makeGuard({
      feature: ['purchase-orders'],
      permissions: null,
      role: 'MANAGER',
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('allows a user whose permissions include the feature', async () => {
    const { guard, context } = makeGuard({
      permissions: JSON.stringify(['requirements', 'items']),
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('rejects a user whose permissions exclude the feature', async () => {
    const { guard, context } = makeGuard({
      permissions: JSON.stringify(['items']),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects unparseable permissions', async () => {
    const { guard, context } = makeGuard({ permissions: 'not-json{' });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('rejects a deleted account', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn(() => Promise.resolve(null)),
      },
    };
    const reflector = {
      getAllAndOverride: jest.fn(() => ['requirements']),
    };
    const guard = new FeatureGuard(reflector as never, prisma as never);
    const context = {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user: { id: 99, role: 'STORE_KEEPER' } }),
      }),
    } as never;
    await expect(guard.canActivate(context)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('never locks an ADMIN out of user/settings management', async () => {
    const { guard, context } = makeGuard({
      feature: ['users'],
      role: 'ADMIN',
      permissions: JSON.stringify(['dashboard']),
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('enforces restricted features against ADMIN too', async () => {
    const { guard, context } = makeGuard({
      role: 'ADMIN',
      permissions: JSON.stringify(['dashboard']),
    });
    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
