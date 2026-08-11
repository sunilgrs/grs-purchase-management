import { describe, it, expect } from '@jest/globals';
import {
  buildWhatsAppLink,
  formatDateLabel,
  buildRequirementMessage,
  buildDiscrepancyMessage,
  WHATSAPP_FORMATS,
} from './whatsapp.js';

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

describe('WHATSAPP_FORMATS', () => {
  it('offers formal, short and friendly formats', () => {
    expect(WHATSAPP_FORMATS.map((f) => f.id)).toEqual([
      'formal',
      'short',
      'friendly',
    ]);
  });
});

describe('buildRequirementMessage', () => {
  const data = {
    vendor: 'Acme Supplies',
    poNumber: 'PO-0001',
    requirementNo: 'REQ-1',
    expectedDate: '2026-08-30T00:00:00Z',
    items: [
      { itemName: 'Cement', orderedQty: 5, unit: 'bag', unitPrice: 450 },
      { itemName: 'Steel Rods', orderedQty: 10, unit: 'pcs', unitPrice: null },
    ],
  };

  it('renders the formal format with numbered lines and price', () => {
    const message = buildRequirementMessage(data, 'formal');
    expect(message).toContain('Dear Acme Supplies,');
    expect(message).toContain('PO-0001');
    expect(message).toContain('REQ-1');
    expect(message).toContain('1. Cement — 5 bag @ ₹450');
    expect(message).toContain('2. Steel Rods — 10 pcs');
    expect(message).toContain('Expected delivery: 30 Aug 2026');
  });

  it('renders the short format more concisely', () => {
    const message = buildRequirementMessage(data, 'short');
    expect(message).toContain('Hi Acme Supplies,');
    expect(message).toContain('Order PO-0001 is confirmed');
    expect(message).toContain('Delivery expected by 30 Aug 2026');
    expect(message).not.toContain('Dear Acme Supplies');
  });

  it('renders the friendly format', () => {
    const message = buildRequirementMessage(data, 'friendly');
    expect(message).toContain('Hello Acme Supplies!');
    expect(message).toContain('arrange delivery by 30 Aug 2026');
  });

  it('defaults to formal when no format is given', () => {
    expect(buildRequirementMessage(data)).toBe(
      buildRequirementMessage(data, 'formal'),
    );
  });
});

describe('buildDiscrepancyMessage', () => {
  const data = {
    vendor: 'Acme Supplies',
    poNumber: 'PO-0001',
    itemName: 'Cement',
    discrepancyType: 'DAMAGE',
    quantity: 3,
    description: 'Bags torn on arrival',
  };

  it('renders the formal format with item and issue details', () => {
    const message = buildDiscrepancyMessage(data, 'formal');
    expect(message).toContain('Dear Acme Supplies,');
    expect(message).toContain('Item: Cement');
    expect(message).toContain('Issue: DAMAGE (qty 3)');
    expect(message).toContain('Details: Bags torn on arrival');
    expect(message).toContain('Please arrange a replacement at the earliest.');
  });

  it('renders the short format', () => {
    const message = buildDiscrepancyMessage(data, 'short');
    expect(message).toContain('Hi Acme Supplies,');
    expect(message).toContain('Please send a replacement as soon as possible.');
  });

  it('renders the friendly format', () => {
    const message = buildDiscrepancyMessage(data, 'friendly');
    expect(message).toContain('Hello Acme Supplies,');
    expect(message).toContain('Many thanks!');
  });

  it('omits the details line when there is no description', () => {
    const message = buildDiscrepancyMessage(
      { ...data, description: null },
      'formal',
    );
    expect(message).not.toContain('Details:');
  });
});
