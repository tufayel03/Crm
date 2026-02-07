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
  // 1. Check Global Rate Limits
  const settings = await Settings.findOne({});
  const limits = settings?.campaignLimits || { hourly: 100, daily: 1000 };

  const now = new Date();
  const oneHourAgo = new Date(now - 60 * 60 * 1000);
  const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

  // Aggregate total sent counts across ALL campaigns
  const stats = await Campaign.aggregate([
    { $unwind: "$queue" },
    { $match: { "queue.status": "Sent", "queue.sentAt": { $gte: oneDayAgo } } },
    {
      $group: {
        _id: null,
        hourly: {
          $sum: { $cond: [{ $gte: ["$queue.sentAt", oneHourAgo] }, 1, 0] }
        },
        daily: { $sum: 1 }
      }
    }
  ]);

  const currentUsage = stats[0] || { hourly: 0, daily: 0 };

  if (currentUsage.hourly >= limits.hourly) {
    console.log(`[CampaignRunner] Hourly limit reached (${currentUsage.hourly}/${limits.hourly}). Pausing.`);
    return;
  }

  if (currentUsage.daily >= limits.daily) {
    console.log(`[CampaignRunner] Daily limit reached (${currentUsage.daily}/${limits.daily}). Pausing.`);
    return;
  }

  // Calculate remaining quota for this batch
  const hourlyRemaining = limits.hourly - currentUsage.hourly;
  const dailyRemaining = limits.daily - currentUsage.daily;
  const safeBatchSize = Math.min(batchSize, hourlyRemaining, dailyRemaining);

  if (safeBatchSize <= 0) return;

  // 2. Atomic Locking: Find pending items and mark as "Processing"
  // We use the campaign ID and filter for Pending items.
  // Note: We can't limit the update easily with pure Mongoose updateMany + limit.
  // So we fetch, slice, then update specific IDs.

  // Re-fetch campaign to get latest queue state (in case of concurrent edits)
  const freshCampaign = await Campaign.findById(campaign._id);
  const pendingItems = freshCampaign.queue.filter(q => q.status === 'Pending').slice(0, safeBatchSize);

  if (pendingItems.length === 0) {
    if (freshCampaign.queue.every(q => q.status === 'Sent' || q.status === 'Failed')) {
      freshCampaign.status = 'Completed';
      freshCampaign.completedAt = new Date();
      await freshCampaign.save();
    }
    return;
  }

  // Mark selected items as Processing
  const targetTrackingIds = pendingItems.map(p => p.trackingId);
  await Campaign.updateMany(
    { _id: campaign._id },
    { $set: { "queue.$[elem].status": 'Processing' } },
    { arrayFilters: [{ "elem.trackingId": { $in: targetTrackingIds } }] }
  );

  // 3. Process the locked batch
  const template = campaign.templateId ? await EmailTemplate.findById(campaign.templateId) : null;
  const html = template?.htmlContent || campaign.previewText || '';
  const general = settings?.generalSettings || {};
  const account = await getEmailAccount({ purpose: 'campaigns' });

  let sentCount = 0;
  let failedCount = 0;

  for (const item of pendingItems) {
    try {
      const lead = await Lead.findById(item.leadId).lean();
      const client = await Client.findOne({ leadId: item.leadId }).lean();
      const leadName = lead?.name || item.leadName || '';
      const leadFirstName = leadName ? leadName.split(' ')[0] : '';

      // Only attach logo if the template actually uses it
      // This prevents the logo from appearing as an attachment when not needed
      const usesLogoToken = /{{\s*company_logo\s*}}/i.test(html);
      let logoHtml = '';
      let logoAttachments = [];

      if (usesLogoToken) {
        const logoResult = buildInlineLogo(general);
        logoHtml = logoResult.logoHtml;
        logoAttachments = logoResult.attachments;
      }

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

      // Update item status to Sent
      await Campaign.updateOne(
        { _id: campaign._id },
        {
          $set: {
            "queue.$[elem].status": 'Sent',
            "queue.$[elem].sentAt": new Date()
          },
          $inc: { sentCount: 1 }
        },
        { arrayFilters: [{ "elem.trackingId": item.trackingId }] }
      );
      sentCount++;
    } catch (e) {
      console.error(`[Campaign] Failed to send to ${item.leadEmail}:`, e.message);
      // Update item status to Failed
      await Campaign.updateOne(
        { _id: campaign._id },
        {
          $set: {
            "queue.$[elem].status": 'Failed',
            "queue.$[elem].error": e.message,
            "queue.$[elem].sentAt": new Date()
          },
          $inc: { failedCount: 1 }
        },
        { arrayFilters: [{ "elem.trackingId": item.trackingId }] }
      );
      failedCount++;
    }
  }

  // 4. Final Cleanup / Status Check
  const finalCheck = await Campaign.findById(campaign._id);
  const remaining = finalCheck.queue.filter(q => q.status === 'Pending' || q.status === 'Processing').length;
  if (remaining === 0) {
    finalCheck.status = 'Completed';
    finalCheck.completedAt = new Date();
    await finalCheck.save();
  } else {
    // If we missed any stuck in processing (e.g. crash), they might need reset, but for now we assume loop continues
    if (finalCheck.status !== 'Sending') {
      finalCheck.status = 'Sending'; // Ensure it stays active if items remain
      await finalCheck.save();
    }
  }
};

const processCampaigns = async (batchSize = 20) => {
  // Find campaigns that are Queued or Sending
  // Also check Scheduled campaigns that are due
  const now = new Date();

  // Activate scheduled campaigns
  await Campaign.updateMany(
    { status: 'Scheduled', scheduledAt: { $lte: now } },
    { $set: { status: 'Queued' } }
  );

  const campaigns = await Campaign.find({ status: { $in: ['Queued', 'Sending'] } });
  for (const campaign of campaigns) {
    await runBatchForCampaign(campaign, batchSize);
  }
};

const startCampaignRunner = ({ intervalMs = 60000, batchSize = 20 } = {}) => {
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
  // Run immediately on start
  tick();
  return setInterval(tick, intervalMs);
};

module.exports = { startCampaignRunner, runBatchForCampaign };
