/**
 * WhatsApp message builders for order and replacement notifications.
 * Each message type can be rendered in several selectable formats.
 */

export const WHATSAPP_FORMATS = [
  { id: 'formal', label: 'Formal' },
  { id: 'short', label: 'Short & Concise' },
  { id: 'friendly', label: 'Friendly' },
] as const;

export type WhatsAppFormat = (typeof WHATSAPP_FORMATS)[number]['id'];

export interface RequirementMessageItem {
  itemName: string;
  orderedQty: number;
  unit?: string | null;
  unitPrice?: number | null;
}

export interface RequirementMessageData {
  vendor: string;
  poNumber: string;
  requirementNo: string;
  expectedDate: Date | string;
  items: RequirementMessageItem[];
}

export interface DiscrepancyMessageData {
  vendor: string;
  poNumber: string;
  itemName: string;
  discrepancyType: string;
  quantity?: number | null;
  description?: string | null;
}

/**
 * Builds a https://wa.me/<number>?text=... deep link for the given message.
 * Returns null when no usable mobile number is present.
 */
export function buildWhatsAppLink(
  message: string,
  mobile?: string | null,
): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatDateLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function requirementLines(items: RequirementMessageItem[]): string[] {
  return items.map((it, i) => {
    const price = it.unitPrice != null ? ` @ ₹${it.unitPrice}` : '';
    return `${i + 1}. ${it.itemName} — ${it.orderedQty} ${it.unit ?? ''}${price}`;
  });
}

export function buildRequirementMessage(
  data: RequirementMessageData,
  format: WhatsAppFormat = 'formal',
): string {
  const date = formatDateLabel(data.expectedDate);
  const lines = requirementLines(data.items);

  switch (format) {
    case 'short':
      return [
        `Hi ${data.vendor},`,
        '',
        `Order ${data.poNumber} is confirmed (requirement ${data.requirementNo}). Please supply:`,
        '',
        ...lines,
        '',
        `Delivery expected by ${date}. Kindly confirm.`,
        '',
        'Thanks.',
        'GRS IPS Purchase Management',
      ].join('\n');
    case 'friendly':
      return [
        `Hello ${data.vendor}!`,
        '',
        `We have an order for you — PO ${data.poNumber} against requirement ${data.requirementNo}. Here is what we need:`,
        '',
        ...lines,
        '',
        `Could you please arrange delivery by ${date}? Let us know if that works for you.`,
        '',
        'Thanks a lot!',
        'GRS IPS Purchase Management',
      ].join('\n');
    case 'formal':
    default:
      return [
        `Dear ${data.vendor},`,
        '',
        `We have placed the following order (PO ${data.poNumber}) against requirement ${data.requirementNo}. Please arrange supply:`,
        '',
        ...lines,
        '',
        `Expected delivery: ${date}`,
        'Kindly acknowledge and confirm the delivery date.',
        '',
        'Thank you.',
        'GRS IPS Purchase Management',
      ].join('\n');
  }
}

export function buildDiscrepancyMessage(
  data: DiscrepancyMessageData,
  format: WhatsAppFormat = 'formal',
): string {
  const issueLine = `Issue: ${data.discrepancyType}${
    data.quantity != null ? ` (qty ${data.quantity})` : ''
  }`;

  switch (format) {
    case 'short':
      return [
        `Hi ${data.vendor},`,
        '',
        `Delivery against PO ${data.poNumber} has an issue:`,
        '',
        `Item: ${data.itemName}`,
        issueLine,
        data.description ? `Details: ${data.description}` : null,
        '',
        'Please send a replacement as soon as possible.',
        '',
        'Thanks.',
        'GRS IPS Purchase Management',
      ]
        .filter((line) => line !== null)
        .join('\n');
    case 'friendly':
      return [
        `Hello ${data.vendor},`,
        '',
        `Thanks for the recent delivery against PO ${data.poNumber}. Unfortunately, there is an issue with one of the items:`,
        '',
        `Item: ${data.itemName}`,
        issueLine,
        data.description ? `Details: ${data.description}` : null,
        '',
        'Could you please arrange a replacement for us? Let us know when we can expect it.',
        '',
        'Many thanks!',
        'GRS IPS Purchase Management',
      ]
        .filter((line) => line !== null)
        .join('\n');
    case 'formal':
    default:
      return [
        `Dear ${data.vendor},`,
        '',
        `We received delivery against PO ${data.poNumber}, but there is an issue with the following item:`,
        '',
        `Item: ${data.itemName}`,
        issueLine,
        data.description ? `Details: ${data.description}` : null,
        '',
        'Please arrange a replacement at the earliest.',
        '',
        'Thank you.',
        'GRS IPS Purchase Management',
      ]
        .filter((line) => line !== null)
        .join('\n');
  }
}
