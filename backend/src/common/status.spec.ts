import { describe, it, expect } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { assertTransition } from './status.js';

describe('assertTransition', () => {
  it('does not throw when the current status is allowed', () => {
    expect(() =>
      assertTransition('DRAFT', ['DRAFT', 'SUBMITTED'], 'submit'),
    ).not.toThrow();
  });

  it('throws a BadRequestException when the status is not allowed', () => {
    expect(() =>
      assertTransition('COMPLETED', ['DRAFT', 'SUBMITTED'], 'submit'),
    ).toThrow(BadRequestException);
  });

  it('includes the current status in the error message', () => {
    try {
      assertTransition('REJECTED', ['DRAFT'], 'submit');
    } catch (e) {
      expect((e as BadRequestException).message).toContain('REJECTED');
    }
  });
});
