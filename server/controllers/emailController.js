const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const Settings = require('../models/Settings');
const { injectInlineLogo } = require('../utils/inlineLogo');

exports.sendEmail = async (req, res) => {
  const { to, subject, html, text, attachments = [], accountId } = req.body;
  if (!to || !subject) return res.status(400).json({ message: 'To and subject required' });

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

  // 1. Prepare Tracking
  const trackingId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  const trackingPixel = `<img src="${process.env.API_URL || 'http://localhost:5000'}/api/v1/track/manual/${trackingId}" width="1" height="1" style="display:none" />`;
  const htmlWithTracking = finalHtml + trackingPixel;

  const finalAttachments = normalizedAttachments.concat(logoAttachments || []);

  try {
    // 2. Send via NodeMailer
    await sendMail({ to, subject, html: htmlWithTracking, text, attachments: finalAttachments, account, fromName });

    // 3. Save to Database (Sent Folder)
    const fs = require('fs');
    try {
      const MailMessage = require('../models/MailMessage');
      const payload = {
        accountId: account ? account.id : 'default',
        accountEmail: account ? account.email : (process.env.SMTP_USER || 'system'),
        folder: 'SENT',
        messageId: `<${Date.now()}@matlance.com>`,
        from: account ? account.email : (process.env.SMTP_USER || 'system'),
        fromName: fromName,
        to,
        subject,
        body: html,
        timestamp: new Date(),
        isRead: true,
        trackingId
      };

      fs.appendFileSync('debug_email.log', `[${new Date().toISOString()}] Attempting to create MailMessage: ${JSON.stringify(payload)}\n`);

      const msg = await MailMessage.create(payload);

      fs.appendFileSync('debug_email.log', `[${new Date().toISOString()}] Created MailMessage ID: ${msg._id}\n`);

      res.json(msg);
    } catch (dbError) {
      fs.appendFileSync('debug_email.log', `[${new Date().toISOString()}] DB Create Error: ${dbError.message}\n`);
      throw dbError;
    }
  } catch (error) {
    console.error('Email send error:', error);
    if (error.responseCode === 554 || error.message.includes('reputation')) {
      return res.status(400).json({
        message: 'Email blocked by spam filter (Poor Domain Reputation). Check your DNS records (SPF/DKIM) or contact Namecheap support.',
        rawError: error.message
      });
    }
    res.status(500).json({ message: 'Failed to send email: ' + error.message });
  }
};
