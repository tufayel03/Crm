export const generateInvoiceId = (existingIds: string[] = []): string => {
  const existing = new Set(existingIds.filter(Boolean));
  let candidate = '';
  let attempts = 0;

  while (attempts < 5000) {
    const num = Math.floor(10000 + Math.random() * 90000);
    candidate = num.toString();
    if (!existing.has(candidate)) {
      return candidate;
    }
    attempts += 1;
  }

  const fallback = (Math.floor(Math.random() * 100000))
    .toString()
    .padStart(5, '0')
    .slice(-5);
  return fallback;
};

export const getInvoiceDisplayId = (invoiceId?: string, fallbackId?: string): string => {
  if (invoiceId && /^\d{5}$/.test(invoiceId)) return invoiceId;
  return fallbackId || '';
};
