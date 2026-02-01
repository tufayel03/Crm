const Campaign = require('../models/Campaign');
const EmailTemplate = require('../models/EmailTemplate');
const { sendMail } = require('../utils/mailer');
const { getEmailAccount } = require('../utils/emailAccounts');
const { injectOpenPixel, wrapClickTracking, createTrackingId } = require('../utils/tracking');
const Settings = require('../models/Settings');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { applyTemplateTokens } = require('../utils/templateTokens');
const { buildInlineLogo } = require('../utils/inlineLogo');

const runBatchForCampaign = async (campaign, batchSize = 20) => {
  const pending = campaign.queue.filter(q => q.status === 'Pending');
  if (pending.length === 0) {
    campaign.status = 'Completed';
    campaign.completedAt = campaign.completedAt || new Date();
    await campaign.save();
    return;
  }

  const template = campaign.templateId ? await EmailTemplate.findById(campaign.templateId) : null;
  const html = template?.htmlContent || campaign.previewText || '';
  const settings = await Settings.findOne({});
  const general = settings?.generalSettings || {};
  const account = await getEmailAccount({ purpose: 'campaigns' });

  const batch = pending.slice(0, batchSize);
  let sentCount = 0;
  let failedCount = 0;

  for (const item of batch) {
    try {
      if (!item.trackingId) item.trackingId = createTrackingId();
      const lead = await Lead.findById(item.leadId).lean();
      const client = await Client.findOne({ leadId: item.leadId }).lean();
      const leadName = lead?.name || item.leadName || '';
      const leadFirstName = leadName ? leadName.split(' ')[0] : '';
      const { logoHtml, attachments: logoAttachments } = buildInlineLogo(general);
      const primaryService = Array.isArray(client?.services) && client.services.length > 0
        ? (client.services.find(s => s.status === 'Active') || client.services[0])?.type || ''
        : '';

      const tokenData = {
        lead_name: leadName,
        lead_first_name: leadFirstName,
        lead_email: lead?.email || item.leadEmail || '',
        client_name: client?.companyName || leadName,
        company_name: general.companyName || '',
        company_logo: logoHtml || '',
        company_logo_url: general.logoUrl || '',
        company_email: general.supportEmail || '',
        company_phone: general.companyPhone || '',
        company_address: general.companyAddress || '',
        company_website: general.companyWebsite || '',
        unsubscribe_link: general.publicTrackingUrl || general.companyWebsite || '',
        service: primaryService,
        amount: '',
        due_date: '',
        invoice_id: '',
        meeting_title: '',
        link: '',
        host_name: ''
      };

      const subject = applyTemplateTokens(template?.subject || campaign.templateName || campaign.name, tokenData);
      const htmlWithTokens = applyTemplateTokens(html, tokenData);
      const baseUrl = general.publicTrackingUrl || '';
      const htmlWithPixel = injectOpenPixel(htmlWithTokens, campaign.id, item.trackingId, baseUrl);
      const htmlTracked = wrapClickTracking(htmlWithPixel, campaign.id, item.trackingId, baseUrl);
      await sendMail({
        to: item.leadEmail,
        subject,
        html: htmlTracked,
        attachments: logoAttachments || [],
        account,
        fromName: general.companyName || 'Matlance'
      });
      item.status = 'Sent';
      item.sentAt = new Date();
      sentCount++;
    } catch (e) {
      item.status = 'Failed';
      item.error = e.message;
      item.sentAt = new Date();
      failedCount++;
    }
  }

  campaign.sentCount += sentCount;
  campaign.failedCount += failedCount;

  const remaining = campaign.queue.filter(q => q.status === 'Pending').length;
  campaign.status = remaining === 0 ? 'Completed' : 'Sending';
  if (remaining === 0) campaign.completedAt = new Date();

  await campaign.save();
};

const processCampaigns = async (batchSize = 20) => {
  const campaigns = await Campaign.find({ status: { $in: ['Queued', 'Sending'] } });
  for (const campaign of campaigns) {
    await runBatchForCampaign(campaign, batchSize);
  }
};

const startCampaignRunner = ({ intervalMs = 30000, batchSize = 20 } = {}) => {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await processCampaigns(batchSize);
    } catch (err) {
      console.error('Campaign runner error:', err?.message || err);
    } finally {
      running = false;
    }
  };
  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startCampaignRunner };
