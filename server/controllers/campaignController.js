const { sendMail } = require('../utils/mailer');
const Campaign = require('../models/Campaign');
const EmailTemplate = require('../models/EmailTemplate');
const { getEmailAccount } = require('../utils/emailAccounts');
const { injectOpenPixel, wrapClickTracking, createTrackingId } = require('../utils/tracking');
const Settings = require('../models/Settings');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { applyTemplateTokens } = require('../utils/templateTokens');

exports.getCampaigns = async (req, res) => {
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 });
  res.json(campaigns);
};

exports.createCampaign = async (req, res) => {
  const campaign = await Campaign.create(req.body);
  res.status(201).json(campaign);
};

exports.updateCampaign = async (req, res) => {
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json(campaign);
};

exports.deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json({ message: 'Campaign removed' });
};

exports.sendCampaignBatch = async (req, res) => {
  const { batchSize = 20, accountId } = req.body || {};
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  const pending = campaign.queue.filter(q => q.status === 'Pending');
  if (pending.length === 0) {
    campaign.status = 'Completed';
    campaign.completedAt = campaign.completedAt || new Date();
    await campaign.save();
    return res.json(campaign);
  }

  const template = campaign.templateId ? await EmailTemplate.findById(campaign.templateId) : null;
  const html = template?.htmlContent || campaign.previewText || '';
  const settings = await Settings.findOne({});
  const general = settings?.generalSettings || {};
  const account = await getEmailAccount({ accountId, purpose: 'campaigns' });

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
      const tokenData = {
        lead_name: leadName,
        lead_first_name: leadFirstName,
        lead_email: lead?.email || item.leadEmail || '',
        client_name: client?.companyName || leadName,
        company_name: general.companyName || '',
        company_logo: general.logoUrl || '',
        company_email: general.supportEmail || '',
        company_phone: general.companyPhone || '',
        company_website: general.companyWebsite || ''
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
  if (remaining === 0) {
    campaign.completedAt = new Date();
  }

  await campaign.save();
  res.json(campaign);
};
