const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const Settings = require('../models/Settings');
const { injectInlineLogo } = require('../utils/inlineLogo');
const { createTrackingId, injectManualOpenPixel, getBaseUrl } = require('../utils/tracking');
const MailMessage = require('../models/MailMessage');

const normalizeRecipients = (to) => {
  const raw = Array.isArray(to) ? to : [to];
  const parts = raw
    .flatMap((value) => String(value || '').split(/[;,]/g))
    .map((value) => value.trim())
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  for (const email of parts) {
    const key = email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(email);
    }
  }
  return deduped;
};

exports.sendEmail = async (req, res) => {
  const { to, subject, html, text, attachments = [], accountId, clientRequestId } = req.body;
  if (!to || !subject) return res.status(400).json({ message: 'To and subject required' });

  const recipients = normalizeRecipients(to);
  if (recipients.length === 0) {
    return res.status(400).json({ message: 'At least one valid recipient is required' });
  }

  const normalizedAttachments = (attachments || []).map(a => ({
    filename: a.filename,
    content: a.contentBase64,
    encoding: 'base64',
    contentType: a.contentType
  }));

  const settings = await Settings.findOne({});
  const fromName = settings?.generalSettings?.companyName || 'Matlance';
  const account = await getEmailAccount({ accountId, purpose: 'clients' });
  const { html: finalHtml, attachments: logoAttachments } = injectInlineLogo(html, settings?.generalSettings || {});
  const baseUrl = settings?.generalSettings?.publicTrackingUrl || process.env.API_URL || getBaseUrl();

  const finalAttachments = normalizedAttachments.concat(logoAttachments || []);

  const sentMessages = [];
  const failures = [];

  for (const recipient of recipients) {
    let requestIdForRecipient = null;
    try {
      requestIdForRecipient = clientRequestId
        ? `${String(clientRequestId).trim()}:${recipient.toLowerCase()}`
        : null;

      if (requestIdForRecipient) {
        const existingMessage = await MailMessage.findOne({ clientRequestId: requestIdForRecipient });
        if (existingMessage) {
          sentMessages.push(existingMessage);
          continue;
        }
      }

      const trackingId = createTrackingId();
      const htmlWithTracking = injectManualOpenPixel(finalHtml, trackingId, baseUrl);

      await sendMail({
        to: recipient,
        subject,
        html: htmlWithTracking,
        text,
        attachments: finalAttachments,
        account,
        fromName
      });

      const payload = {
        accountId: account ? account.id : 'default',
        accountEmail: account ? account.email : (process.env.SMTP_USER || 'system'),
        folder: 'SENT',
        messageId: `<${Date.now()}-${trackingId}@matlance.com>`,
        clientRequestId: requestIdForRecipient || undefined,
        from: account ? account.email : (process.env.SMTP_USER || 'system'),
        fromName,
        to: recipient,
        subject,
        body: finalHtml || '',
        timestamp: new Date(),
        isRead: true,
        trackingId
      };

      const msg = await MailMessage.create(payload);
      sentMessages.push(msg);
    } catch (error) {
      if (requestIdForRecipient && error?.code === 11000) {
        const existingMessage = await MailMessage.findOne({ clientRequestId: requestIdForRecipient });
        if (existingMessage) {
          sentMessages.push(existingMessage);
          continue;
        }
      }

      failures.push({
        to: recipient,
        message: error?.message || 'Failed to send email'
      });
    }
  }

  if (sentMessages.length === 0) {
    const firstError = failures[0]?.message || 'Failed to send email';
    if (firstError.includes('reputation')) {
      return res.status(400).json({
        message: 'Email blocked by spam filter (Poor Domain Reputation). Check your DNS records (SPF/DKIM) or contact Namecheap support.',
        rawError: firstError
      });
    }
    return res.status(500).json({ message: 'Failed to send email: ' + firstError, failures });
  }

  if (sentMessages.length === 1 && recipients.length === 1) {
    return res.json(sentMessages[0]);
  }

  return res.status(failures.length > 0 ? 207 : 200).json({
    message: failures.length > 0
      ? `Sent ${sentMessages.length}/${recipients.length} emails`
      : `Sent ${sentMessages.length} emails`,
    sentCount: sentMessages.length,
    failedCount: failures.length,
    sent: sentMessages,
    failures
  });
};
