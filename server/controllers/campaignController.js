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
