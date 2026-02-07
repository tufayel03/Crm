const crypto = require('crypto');

const getBaseUrl = (override) => {
  if (override) return override;
  return (
    process.env.PUBLIC_BASE_URL ||
    process.env.APP_BASE_URL ||
    process.env.BASE_URL ||
    `http://localhost:${process.env.PORT || 5000}`
  );
};

const createTrackingId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const getTrackingSecret = () => process.env.TRACKING_LINK_SECRET || process.env.JWT_SECRET || 'matlance-tracking-secret';
const signClickTarget = (campaignId, trackingId, url) => {
  const payload = `${campaignId}:${trackingId}:${url}`;
  return crypto.createHmac('sha256', getTrackingSecret()).update(payload).digest('hex');
};

const injectOpenPixel = (html = '', campaignId, trackingId, baseOverride) => {
  if (!campaignId || !trackingId) return html;
  const baseUrl = getBaseUrl(baseOverride).replace(/\/$/, '');
  const pixelUrl = `${baseUrl}/api/v1/track/open/${encodeURIComponent(campaignId)}/${encodeURIComponent(trackingId)}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" data-track-open="1" />`;

  if (!html) return pixelTag;
  if (html.includes('data-track-open')) return html;
  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelTag}</body>`);
  }
  return `${html}${pixelTag}`;
};

const wrapClickTracking = (html = '', campaignId, trackingId, baseOverride) => {
  if (!campaignId || !trackingId || !html) return html;
  const baseUrl = getBaseUrl(baseOverride).replace(/\/$/, '');
  const trackBase = `${baseUrl}/api/v1/track/click/${encodeURIComponent(campaignId)}/${encodeURIComponent(trackingId)}`;

  const shouldTrack = (url) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.startsWith('mailto:') || lower.startsWith('tel:') || lower.startsWith('javascript:') || lower.startsWith('#')) {
      return false;
    }
    if (lower.includes('/api/v1/track/click/')) return false;
    return true;
  };

  return html.replace(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi, (match, href) => {
    if (!shouldTrack(href)) return match;
    const sig = signClickTarget(campaignId, trackingId, href);
    const trackedUrl = `${trackBase}?u=${encodeURIComponent(href)}&sig=${encodeURIComponent(sig)}`;
    return match.replace(href, trackedUrl);
  });
};

module.exports = { injectOpenPixel, wrapClickTracking, createTrackingId, getBaseUrl, signClickTarget };
