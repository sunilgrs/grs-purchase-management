/**
 * WhatsApp message builders for order and replacement notifications.
 * Messages are rendered in a single formal format.
 */

export const WHATSAPP_FORMATS = [{ id: 'formal', label: 'Formal' }] as const;

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

export function buildRequirementMessage(data: RequirementMessageData): string {
  const date = formatDateLabel(data.expectedDate);
  const lines = requirementLines(data.items);

  return [
    `Dear ${data.vendor},`,
    '',
    `We have placed the following order (PO ${data.poNumber}). Please arrange supply:`,
    '',
    ...lines,
    '',
    `Expected delivery: ${date}`,
    '',
    '',
    'Thank you.',
    'GRS Fantasy Park, Mysuru',
  ].join('\n');
}

export function buildDiscrepancyMessage(data: DiscrepancyMessageData): string {
  const issueLine = `Issue: ${data.discrepancyType}${
    data.quantity != null ? ` (qty ${data.quantity})` : ''
  }`;

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
    'GRS Fantasy Park, Mysuru',
  ]
    .filter((line) => line !== null)
    .join('\n');
}
