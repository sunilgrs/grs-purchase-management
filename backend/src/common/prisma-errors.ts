import { ConflictException } from '@nestjs/common';

/**
 * Re-throws a Prisma foreign-key violation (P2003) as a user-friendly
 * ConflictException so record deletions blocked by related records do not
 * surface as opaque 500 errors.
 */
export function throwIfForeignKeyViolation(
  err: unknown,
  message: string,
): never {
  if ((err as { code?: string } | null)?.code === 'P2003') {
    throw new ConflictException(message);
  }
  throw err;
}
