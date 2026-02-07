const Campaign = require('../models/Campaign');
const { signClickTarget } = require('../utils/tracking');

const ONE_BY_ONE_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

exports.open = async (req, res) => {
  try {
    const { campaignId, trackingId } = req.params;
    if (campaignId && trackingId) {
      await Campaign.updateOne(
        { _id: campaignId, 'queue.trackingId': trackingId, 'queue.openedAt': { $exists: false } },
        { $set: { 'queue.$.openedAt': new Date() }, $inc: { openCount: 1 } }
      );
    }
  } catch (e) {
    // Swallow errors to avoid breaking image fetch
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).end(ONE_BY_ONE_GIF, 'binary');
  res.setHeader('Expires', '0');
  res.status(200).end(ONE_BY_ONE_GIF, 'binary');
};

const MailMessage = require('../models/MailMessage');

exports.manualOpen = async (req, res) => {
  try {
    const { trackingId } = req.params;
    if (trackingId) {
      await MailMessage.updateOne(
        { trackingId, openedAt: { $exists: false } }, // Only track first open
        { $set: { openedAt: new Date() } }
      );
    }
  } catch (e) { }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.status(200).end(ONE_BY_ONE_GIF, 'binary');
};

exports.click = async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const target = req.query.u;
  const sig = req.query.sig;

  try {
    if (campaignId && trackingId) {
      await Campaign.updateOne(
        { _id: campaignId, 'queue.trackingId': trackingId, 'queue.clickedAt': { $exists: false } },
        { $set: { 'queue.$.clickedAt': new Date() }, $inc: { clickCount: 1 } }
      );
    }
  } catch (e) {
    // Swallow errors and still redirect
  }

  if (!target || typeof target !== 'string') {
    return res.redirect(302, '/');
  }

  let decoded = target;
  try {
    decoded = decodeURIComponent(target);
  } catch {
    decoded = target;
  }

  const expectedSig = signClickTarget(campaignId, trackingId, decoded);
  if (!sig || typeof sig !== 'string' || sig !== expectedSig) {
    return res.redirect(302, '/');
  }

  let urlObj;
  try {
    urlObj = new URL(decoded);
  } catch {
    return res.redirect(302, '/');
  }
  if (!['http:', 'https:'].includes(urlObj.protocol)) {
    return res.redirect(302, '/');
  }

  return res.redirect(302, decoded);
};
