const { sendMail } = require('../utils/mailer');
const Campaign = require('../models/Campaign');
const EmailTemplate = require('../models/EmailTemplate');
const { getEmailAccount } = require('../utils/emailAccounts');
const { injectOpenPixel, wrapClickTracking, createTrackingId } = require('../utils/tracking');
const Settings = require('../models/Settings');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { applyTemplateTokens } = require('../utils/templateTokens');

const ensureUniqueTrackingIds = (queue = []) => {
  const seen = new Set();
  return queue.map((item) => {
    const next = { ...item };
    while (!next.trackingId || seen.has(next.trackingId)) {
      next.trackingId = createTrackingId();
    }
    seen.add(next.trackingId);
    return next;
  });
};

exports.getCampaigns = async (req, res) => {
  const campaigns = await Campaign.find({}).sort({ createdAt: -1 });
  res.json(campaigns);
};

exports.createCampaign = async (req, res) => {
  const payload = { ...req.body };
  if (Array.isArray(payload.queue)) {
    payload.queue = ensureUniqueTrackingIds(payload.queue);
  }
  const campaign = await Campaign.create(payload);
  res.status(201).json(campaign);
};

exports.updateCampaign = async (req, res) => {
  const updates = { ...req.body };
  if (Array.isArray(updates.queue)) {
    updates.queue = ensureUniqueTrackingIds(updates.queue);
  }
  const campaign = await Campaign.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json(campaign);
};

exports.deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findByIdAndDelete(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  res.json({ message: 'Campaign removed' });
};

exports.sendCampaignBatch = async (req, res) => {
  const { batchSize = 20 } = req.body || {};
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  // Use the safe runner logic which handles rate limits and locking
  const { runBatchForCampaign } = require('../services/campaignRunner');
  await runBatchForCampaign(campaign, batchSize);

  // Re-fetch to return latest state
  const updated = await Campaign.findById(req.params.id);
  res.json(updated);
};

exports.retryFailedRecipients = async (req, res) => {
  const campaign = await Campaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  let retriedCount = 0;
  const nextQueue = campaign.queue.map((item) => {
    if (item.status !== 'Failed') return item;
    retriedCount += 1;
    return {
      ...item,
      status: 'Pending',
      error: undefined,
      sentAt: undefined
    };
  });

  if (retriedCount === 0) {
    return res.json(campaign);
  }

  campaign.queue = nextQueue;
  campaign.failedCount = Math.max(0, (campaign.failedCount || 0) - retriedCount);
  campaign.status = 'Queued';
  campaign.completedAt = undefined;
  campaign.markModified('queue');
  await campaign.save();

  const { runBatchForCampaign } = require('../services/campaignRunner');
  await runBatchForCampaign(campaign, 50);

  const updated = await Campaign.findById(req.params.id);
  res.json(updated);
};

exports.retargetUnopenedRecipients = async (req, res) => {
  const { templateId, senderAccountIds: rawSenderAccountIds } = req.body || {};
  if (!templateId) return res.status(400).json({ message: 'templateId is required' });

  const sourceCampaign = await Campaign.findById(req.params.id);
  if (!sourceCampaign) return res.status(404).json({ message: 'Campaign not found' });

  const template = await EmailTemplate.findById(templateId);
  if (!template) return res.status(404).json({ message: 'Template not found' });

  const unopenedSent = (sourceCampaign.queue || []).filter((item) =>
    item.status === 'Sent' &&
    !item.openedAt &&
    item.leadEmail
  );

  // Guard against accidental duplicates by email.
  const uniqueByEmail = new Map();
  unopenedSent.forEach((item) => {
    const emailKey = String(item.leadEmail || '').trim().toLowerCase();
    if (!emailKey || uniqueByEmail.has(emailKey)) return;
    uniqueByEmail.set(emailKey, item);
  });

  const recipients = Array.from(uniqueByEmail.values());
  if (recipients.length === 0) {
    return res.status(400).json({ message: 'No unopened recipients to retarget.' });
  }

  const requestedSenderIds = Array.isArray(rawSenderAccountIds)
    ? Array.from(new Set(rawSenderAccountIds.map((id) => String(id || '').trim()).filter(Boolean)))
    : [];

  const settings = await Settings.findOne({});
  const availableAccounts = (settings?.emailAccounts || []).filter((acc) => acc?.isVerified);
  const selectedSenders = requestedSenderIds.map((requestedId) => {
    const matched = availableAccounts.find((acc) =>
      [acc.id, acc._id, acc.email].filter(Boolean).map((v) => String(v)).includes(requestedId)
    );
    if (!matched) return null;
    return {
      id: String(matched.id || matched._id || matched.email),
      email: String(matched.email || '')
    };
  }).filter(Boolean);

  if (requestedSenderIds.length > 0 && selectedSenders.length === 0) {
    return res.status(400).json({ message: 'Selected sender emails are invalid or unavailable.' });
  }

  const senderIds = selectedSenders.length > 0
    ? selectedSenders.map((sender) => sender.id)
    : (Array.isArray(sourceCampaign.senderAccountIds) ? sourceCampaign.senderAccountIds.filter(Boolean) : []);
  const senderEmails = selectedSenders.length > 0
    ? selectedSenders.map((sender) => sender.email)
    : (Array.isArray(sourceCampaign.senderAccountEmails) ? sourceCampaign.senderAccountEmails.filter(Boolean) : []);
  const usingExplicitSelection = selectedSenders.length > 0;

  const queue = recipients.map((item, index) => {
    const fallbackSenderId = senderIds.length > 0 ? senderIds[index % senderIds.length] : undefined;
    const fallbackSenderEmail = senderEmails.length > 0 ? senderEmails[index % senderEmails.length] : undefined;
    return {
      leadId: item.leadId,
      leadName: item.leadName,
      leadEmail: item.leadEmail,
      senderAccountId: usingExplicitSelection ? fallbackSenderId : (item.senderAccountId || fallbackSenderId),
      senderAccountEmail: usingExplicitSelection ? fallbackSenderEmail : (item.senderAccountEmail || fallbackSenderEmail),
      status: 'Pending'
    };
  });

  const payload = {
    name: `${sourceCampaign.name} - Retarget Unopened`,
    templateId: String(template._id),
    templateName: template.name,
    senderAccountId: senderIds[0] || sourceCampaign.senderAccountId,
    senderAccountEmail: senderEmails[0] || sourceCampaign.senderAccountEmail,
    senderAccountIds: senderIds,
    senderAccountEmails: senderEmails,
    status: 'Queued',
    targetStatus: sourceCampaign.targetStatus || 'All',
    targetStatuses: sourceCampaign.targetStatuses || [],
    targetAgentId: sourceCampaign.targetAgentId || 'All',
    targetAgentIds: sourceCampaign.targetAgentIds || [],
    targetOutcome: sourceCampaign.targetOutcome || 'All',
    targetOutcomes: sourceCampaign.targetOutcomes || [],
    targetServiceStatus: sourceCampaign.targetServiceStatus || 'All',
    targetServicePlan: sourceCampaign.targetServicePlan || 'All',
    totalRecipients: queue.length,
    sentCount: 0,
    failedCount: 0,
    openCount: 0,
    clickCount: 0,
    replyCount: 0,
    queue: ensureUniqueTrackingIds(queue),
    previewText: sourceCampaign.previewText
  };

  const created = await Campaign.create(payload);

  const { runBatchForCampaign } = require('../services/campaignRunner');
  await runBatchForCampaign(created, 50);

  const updated = await Campaign.findById(created._id);
  return res.status(201).json(updated);
};
