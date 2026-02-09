const nodemailer = require('nodemailer');

const buildTransportConfig = (account) => {
  if (account) {
    const host = account.smtpHost;
    const port = parseInt(account.smtpPort || '587', 10);
    const user = account.username || account.email;
    const pass = account.password;
    if (!host || !user || !pass) {
      throw new Error('SMTP account incomplete. Provide smtpHost, smtpPort, username/email, and password.');
    }
    return { host, port, secure: port === 465, auth: { user, pass }, fromAddress: account.email || user };
  }

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP not configured. Add an Email Integration in Settings or set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
  }

  return { host, port, secure: port === 465, auth: { user, pass }, fromAddress: process.env.SMTP_FROM || user };
};

const formatFrom = (name, address) => {
  if (!address) return '';
  if (!name) return address;
  if (address.includes('<')) return address;
  return `"${name.replace(/"/g, '')}" <${address}>`;
};

const sendMail = async ({ to, cc, subject, html, text, attachments = [], account, fromName, inReplyTo, references }) => {
  const config = buildTransportConfig(account);
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth
  });

  const info = await transporter.sendMail({
    from: formatFrom(fromName, config.fromAddress),
    to,
    ...(cc ? { cc } : {}),
    subject,
    html,
    text,
    attachments,
    ...(inReplyTo ? { inReplyTo } : {}),
    ...(references && references.length > 0 ? { references } : {})
  });

  return info;
};

module.exports = { sendMail };
