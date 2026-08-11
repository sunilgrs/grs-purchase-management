import { describe, it, expect, jest } from '@jest/globals';
import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users.service.js';

function makeService(user: unknown) {
  const prisma = {
    user: {
      findUnique: jest.fn(() => user),
      update: jest.fn((args: { where: { id: number }; data: unknown }) => ({
        ...user,
        id: args.where.id,
      })),
    },
  };
  const auditLogs = { log: jest.fn() };
  const service = new UsersService(prisma as never, auditLogs as never);
  return { service, prisma, auditLogs };
}

const user = {
  id: 3,
  name: 'Ramesh',
  mobile: '9000000003',
  email: null,
  password: 'hashed',
  role: 'STORE_KEEPER',
  status: 'ACTIVE',
  permissions: null,
};

describe('UsersService.resetPassword', () => {
  it('throws for an unknown user', async () => {
    const { service } = makeService(null);
    await expect(service.resetPassword(99, 1)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('sets a temporary password, hashes it and logs the reset', async () => {
    const { service, prisma, auditLogs } = makeService(user);
    const result = await service.resetPassword(3, 1);

    expect(result.temporaryPassword).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(result.name).toBe('Ramesh');

    const update = prisma.user.update as jest.Mock;
    const updateArgs = update.mock.calls[0][0] as {
      where: { id: number };
      data: { password: string };
    };
    expect(updateArgs.where.id).toBe(3);
    expect(updateArgs.data.password).not.toBe(result.temporaryPassword);
    await expect(
      bcrypt.compare(result.temporaryPassword, updateArgs.data.password),
    ).resolves.toBe(true);

    expect(auditLogs.log).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'USER',
        entityId: 3,
        action: 'PASSWORD_RESET',
        performedById: 1,
      }),
    );
  });
});
