import { describe, it, expect } from '@jest/globals';
import { dateStamp, sequentialNumber } from './doc-number.js';

describe('dateStamp', () => {
  it('formats a date as YYYYMMDD', () => {
    expect(dateStamp(new Date(2026, 0, 5))).toBe('20260105');
  });

  it('zero-pads month and day', () => {
    expect(dateStamp(new Date(2026, 11, 25))).toBe('20261225');
  });
});

describe('sequentialNumber', () => {
  it('builds a zero-padded sequential number for a given date', () => {
    expect(sequentialNumber('PO', 3, new Date(2026, 7, 9))).toBe(
      'PO-20260809-0004',
    );
  });
});
