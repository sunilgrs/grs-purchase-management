import { describe, it, expect } from '@jest/globals';
import { ConflictException } from '@nestjs/common';
import { throwIfForeignKeyViolation } from './prisma-errors.js';

describe('throwIfForeignKeyViolation', () => {
  it('rethrows a Prisma P2003 error as a ConflictException', () => {
    const prismaError = { code: 'P2003', message: 'Foreign key constraint' };
    expect(() =>
      throwIfForeignKeyViolation(prismaError, 'Cannot delete'),
    ).toThrow(ConflictException);
  });

  it('uses the given message for the conflict error', () => {
    try {
      throwIfForeignKeyViolation({ code: 'P2003' }, 'Has related records');
    } catch (e) {
      expect((e as ConflictException).message).toBe('Has related records');
    }
  });

  it('rethrows unrelated errors unchanged', () => {
    const original = new Error('boom');
    expect(() => throwIfForeignKeyViolation(original, 'msg')).toThrow('boom');
  });

  it('rethrows null errors unchanged', () => {
    expect(() => throwIfForeignKeyViolation(null, 'msg')).toThrow();
  });
});
