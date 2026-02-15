const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const Settings = require('../models/Settings');
const { injectInlineLogo } = require('../utils/inlineLogo');
const { createTrackingId, injectManualOpenPixel, getBaseUrl } = require('../utils/tracking');
const MailMessage = require('../models/MailMessage');
const {
  buildThreadId,
  formatMessageIdHeader,
  normalizeMessageId,
  parseReferences
} = require('../utils/mailThread');
const { logActivity } = require('../utils/activityLogger');

let syntheticSentUidCounter = 0;
const nextSyntheticSentUid = () => {
  syntheticSentUidCounter = (syntheticSentUidCounter + 1) % 1000;
  // Keep synthetic UIDs negative so they never collide with real IMAP UIDs.
  return -((Date.now() * 1000) + syntheticSentUidCounter);
};

const isLegacyImapUidDuplicate = (error) =>
  error?.code === 11000 &&
  typeof error?.message === 'string' &&
  error.message.includes('accountId_1_imapUid_1');

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
  const {
    to,
    cc,
    subject,
    html,
    text,
    attachments = [],
    accountId,
    purpose,
    clientRequestId,
    inReplyTo,
    references
  } = req.body;
  if (!to || !subject) return res.status(400).json({ message: 'To and subject required' });

  const recipients = normalizeRecipients(to);
  const ccRecipients = normalizeRecipients(cc);
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
  const account = await getEmailAccount({ accountId, purpose: purpose || 'clients' });
  const { html: finalHtml, attachments: logoAttachments } = injectInlineLogo(html, settings?.generalSettings || {});
  const baseUrl = settings?.generalSettings?.publicTrackingUrl || process.env.API_URL || getBaseUrl();

  const finalAttachments = normalizedAttachments.concat(logoAttachments || []);
  const normalizedInReplyTo = normalizeMessageId(inReplyTo);
  const normalizedReferences = parseReferences(references);

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

      const mailInfo = await sendMail({
        to: recipient,
        ...(ccRecipients.length > 0 ? { cc: ccRecipients.join(', ') } : {}),
        subject,
        html: htmlWithTracking,
        text,
        attachments: finalAttachments,
        account,
        fromName,
        inReplyTo: formatMessageIdHeader(normalizedInReplyTo),
        references: normalizedReferences.map(formatMessageIdHeader).filter(Boolean)
      });

      const outboundMessageId = normalizeMessageId(mailInfo?.messageId) || `${Date.now()}-${trackingId}@matlance.com`;
      const threadId = buildThreadId({
        subject,
        messageId: outboundMessageId,
        inReplyTo: normalizedInReplyTo,
        references: normalizedReferences
      });
      const resolvedAccountId = String(account?.id || account?._id || account?.email || 'default');
      const resolvedAccountEmail = String(account?.email || process.env.SMTP_USER || 'system');
      const fromAddress = String(account?.email || process.env.SMTP_USER || 'system');

      const payload = {
        accountId: resolvedAccountId,
        accountEmail: resolvedAccountEmail,
        folder: 'SENT',
        imapUid: nextSyntheticSentUid(),
        messageId: outboundMessageId,
        inReplyTo: normalizedInReplyTo || undefined,
        references: normalizedReferences,
        threadId: threadId || undefined,
        clientRequestId: requestIdForRecipient || undefined,
        from: fromAddress,
        fromName,
        to: recipient,
        ...(ccRecipients.length > 0 ? { cc: ccRecipients.join(', ') } : {}),
        subject,
        body: finalHtml || '',
        timestamp: new Date(),
        isRead: true,
        trackingId
      };

      let msg;
      try {
        msg = await MailMessage.create(payload);
      } catch (createError) {
        if (!isLegacyImapUidDuplicate(createError)) {
          throw createError;
        }

        // Legacy DBs may still have old unique index behavior.
        // Retry once with a fresh synthetic UID so send remains successful.
        msg = await MailMessage.create({
          ...payload,
          imapUid: nextSyntheticSentUid()
        });
      }
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

  await logActivity(req, {
    action: failures.length > 0 ? 'email.send_partial' : 'email.sent',
    module: 'mailbox',
    targetType: 'email',
    details: failures.length > 0
      ? `Email send partial success: ${sentMessages.length}/${recipients.length}`
      : `Email sent to ${sentMessages.length} recipient(s)`
  });

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

exports.getEmailAccounts = async (req, res) => {
  const settings = await Settings.findOne({}).select('emailAccounts');
  const accounts = Array.isArray(settings?.emailAccounts) ? settings.emailAccounts : [];

  // Never expose SMTP credentials to the client.
  const sanitized = accounts.map((acc) => ({
    id: acc.id || String(acc._id || ''),
    _id: acc._id,
    email: acc.email || '',
    username: acc.username || acc.email || '',
    useForCampaigns: Boolean(acc.useForCampaigns),
    useForClients: Boolean(acc.useForClients),
    useForLeads: Boolean(acc.useForLeads),
    isVerified: Boolean(acc.isVerified)
  }));

  res.json({ emailAccounts: sanitized });
};
