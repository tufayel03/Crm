const Campaign = require('../models/Campaign');

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
};

exports.click = async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const target = req.query.u;

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

  return res.redirect(302, decoded);
};
