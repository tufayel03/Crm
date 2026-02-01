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
  const finalAttachments = normalizedAttachments.concat(logoAttachments || []);
  await sendMail({ to, subject, html: finalHtml, text, attachments: finalAttachments, account, fromName });
  res.json({ message: 'Email sent' });
};
