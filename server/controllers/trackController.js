const Campaign = require('../models/Campaign');
const { signClickTarget } = require('../utils/tracking');

const ONE_BY_ONE_GIF = Buffer.from(
  'R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==',
  'base64'
);

const markQueueEventOnce = async ({ campaignId, trackingId, field, counterField }) => {
  if (!campaignId || !trackingId) return false;

  const unopenedCondition = {
    $or: [
      { [field]: { $exists: false } },
      { [field]: null }
    ]
  };

  const arrayFilter = {
    'elem.trackingId': trackingId,
    $or: [
      { [`elem.${field}`]: { $exists: false } },
      { [`elem.${field}`]: null }
    ]
  };

  const result = await Campaign.updateOne(
    {
      _id: campaignId,
      queue: { $elemMatch: { trackingId, ...unopenedCondition } }
    },
    {
      $set: { [`queue.$[elem].${field}`]: new Date() },
      $inc: { [counterField]: 1 }
    },
    {
      arrayFilters: [arrayFilter]
    }
  );

  return result.modifiedCount > 0;
};

exports.open = async (req, res) => {
  try {
    const { campaignId, trackingId } = req.params;
    await markQueueEventOnce({
      campaignId,
      trackingId,
      field: 'openedAt',
      counterField: 'openCount'
    });
  } catch (e) {
    // Swallow errors to avoid breaking image fetch
  }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(200).end(ONE_BY_ONE_GIF, 'binary');
};

const MailMessage = require('../models/MailMessage');

exports.manualOpen = async (req, res) => {
  try {
    const { trackingId } = req.params;
    if (trackingId) {
      await MailMessage.updateOne(
        {
          trackingId,
          $or: [
            { openedAt: { $exists: false } },
            { openedAt: null }
          ]
        }, // Only track first open
        { $set: { openedAt: new Date() } }
      );
    }
  } catch (e) { }

  res.setHeader('Content-Type', 'image/gif');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.status(200).end(ONE_BY_ONE_GIF, 'binary');
};

exports.click = async (req, res) => {
  const { campaignId, trackingId } = req.params;
  const target = req.query.u;
  const sig = req.query.sig;

  try {
    await markQueueEventOnce({
      campaignId,
      trackingId,
      field: 'clickedAt',
      counterField: 'clickCount'
    });
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
