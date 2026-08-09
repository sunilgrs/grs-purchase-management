import { BadRequestException } from '@nestjs/common';

/**
 * Enforces a workflow transition: throws a BadRequestException unless the
 * current status is one of the allowed statuses.
 */
export function assertTransition(
  current: string,
  allowed: readonly string[],
  action: string,
): void {
  if (!allowed.includes(current)) {
    throw new BadRequestException(
      `Cannot ${action} while status is ${current}`,
    );
  }
}
