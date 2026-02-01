const generateInvoiceId = async (PaymentModel) => {
  let attempts = 0;
  while (attempts < 2000) {
    const candidate = Math.floor(10000 + Math.random() * 90000).toString();
    const exists = await PaymentModel.exists({ invoiceId: candidate });
    if (!exists) return candidate;
    attempts += 1;
  }
  return Math.floor(10000 + Math.random() * 90000).toString();
};

const isValidInvoiceId = (value) => typeof value === 'string' && /^\d{5}$/.test(value);

module.exports = { generateInvoiceId, isValidInvoiceId };
