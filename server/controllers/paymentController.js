const Payment = require('../models/Payment');
const Client = require('../models/Client');
const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const { generateInvoiceId, isValidInvoiceId } = require('../utils/invoiceId');
const Settings = require('../models/Settings');
const { applyTemplateTokens } = require('../utils/templateTokens');
const { buildInlineLogo } = require('../utils/inlineLogo');

exports.getPayments = async (req, res) => {
  const payments = await Payment.find({}).sort({ createdAt: -1 });
  let mutated = false;
  for (const payment of payments) {
    if (!isValidInvoiceId(payment.invoiceId)) {
      payment.invoiceId = await generateInvoiceId(Payment);
      await payment.save();
      mutated = true;
    }
  }
  if (mutated) {
    payments.sort((a, b) => b.createdAt - a.createdAt);
  }
  res.json(payments);
};

exports.createPayment = async (req, res) => {
  const payload = { ...req.body };
  if (!isValidInvoiceId(payload.invoiceId)) {
    payload.invoiceId = await generateInvoiceId(Payment);
  }
  const payment = await Payment.create(payload);
  res.status(201).json(payment);
};

exports.updatePayment = async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json(payment);
};

exports.deletePayment = async (req, res) => {
  const payment = await Payment.findByIdAndDelete(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });
  res.json({ message: 'Payment removed' });
};

exports.bulkDeletePayments = async (req, res) => {
  const { ids } = req.body;
  await Payment.deleteMany({ _id: { $in: ids } });
  res.json({ message: 'Payments removed' });
};

exports.sendInvoiceEmail = async (req, res) => {
  const { subject, html, attachmentBase64, attachmentName, attachmentType, to, accountId } = req.body;
  const payment = await Payment.findById(req.params.id);
  if (!payment) return res.status(404).json({ message: 'Payment not found' });

  let recipient = to;
  if (!recipient) {
    const client = await Client.findById(payment.clientId);
    recipient = client?.email;
  }

  if (!recipient) return res.status(400).json({ message: 'Recipient email not found' });

  const attachments = attachmentBase64 ? [{
    filename: attachmentName || `Invoice_${payment.invoiceId || payment.id}.pdf`,
    content: attachmentBase64,
    encoding: 'base64',
    contentType: attachmentType || 'application/pdf'
  }] : [];

  const account = await getEmailAccount({ accountId, purpose: 'clients' });
  const settings = await Settings.findOne({});
  const general = settings?.generalSettings || {};
  const { logoHtml, attachments: logoAttachments } = buildInlineLogo(general);
  const tokenData = {
    client_name: payment.clientName,
    client_email: recipient,
    invoice_id: payment.invoiceId || payment.id,
    amount: payment.amount,
    due_date: payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : '',
    service: payment.serviceType,
    company_name: general.companyName || '',
    company_logo: logoHtml || '',
    company_email: general.supportEmail || '',
    company_phone: general.companyPhone || '',
    company_address: general.companyAddress || '',
    company_website: general.companyWebsite || '',
    unsubscribe_link: general.publicTrackingUrl || general.companyWebsite || ''
  };

  const finalSubject = applyTemplateTokens(subject || `Invoice ${payment.invoiceId || payment.id}`, tokenData);
  const finalHtml = applyTemplateTokens(html || '', tokenData);

  const finalAttachments = attachments.concat(logoAttachments || []);
  await sendMail({ to: recipient, subject: finalSubject, html: finalHtml, attachments: finalAttachments, account, fromName: general.companyName || 'Matlance' });
  res.json({ message: 'Invoice email sent' });
};
