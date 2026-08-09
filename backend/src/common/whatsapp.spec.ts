import { describe, it, expect } from '@jest/globals';
import { buildWhatsAppLink, formatDateLabel } from './whatsapp.js';

describe('buildWhatsAppLink', () => {
  it('returns null when no mobile number is provided', () => {
    expect(buildWhatsAppLink('hello')).toBeNull();
    expect(buildWhatsAppLink('hello', null)).toBeNull();
    expect(buildWhatsAppLink('hello', '')).toBeNull();
  });

  it('returns null when the mobile number has no digits', () => {
    expect(buildWhatsAppLink('hello', 'abc')).toBeNull();
    expect(buildWhatsAppLink('hello', '++-()')).toBeNull();
  });

  it('strips non-digit characters from the number', () => {
    const link = buildWhatsAppLink('hi', '+91 92222-22222');
    expect(link).toBe('https://wa.me/919222222222?text=hi');
  });

  it('URL-encodes the message', () => {
    const link = buildWhatsAppLink('Hello, world!', '9111111111');
    expect(link).toBe('https://wa.me/9111111111?text=Hello%2C%20world!');
  });
});

describe('formatDateLabel', () => {
  it('formats a Date instance as day month year', () => {
    expect(formatDateLabel(new Date('2026-08-09T00:00:00Z'))).toBe(
      '09 Aug 2026',
    );
  });

  it('formats an ISO string date', () => {
    expect(formatDateLabel('2026-12-25T00:00:00Z')).toBe('25 Dec 2026');
  });
});
