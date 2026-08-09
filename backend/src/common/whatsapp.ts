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
