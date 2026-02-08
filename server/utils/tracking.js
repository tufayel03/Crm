const crypto = require('crypto');

const normalizeBaseUrl = (input) => {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  return `https://${raw.replace(/^\/+/, '')}`;
};

const getBaseUrl = (override) => {
  const candidates = [
    override,
    process.env.PUBLIC_BASE_URL,
    process.env.APP_BASE_URL,
    process.env.API_URL,
    process.env.BASE_URL
  ];

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate);
    if (normalized) return normalized;
  }

  return `http://localhost:${process.env.PORT || 5000}`;
};

const createTrackingId = () => {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID().replace(/-/g, '');
  return crypto.randomBytes(16).toString('hex');
};
const getTrackingSecret = () => process.env.TRACKING_LINK_SECRET || process.env.JWT_SECRET || 'matlance-tracking-secret';
const signClickTarget = (campaignId, trackingId, url) => {
  const payload = `${campaignId}:${trackingId}:${url}`;
  return crypto.createHmac('sha256', getTrackingSecret()).update(payload).digest('hex');
};

const OPEN_TRACK_TAG_REGEX = /<img\b[^>]*(?:data-track-open\s*=\s*["']?1["']?|\/api\/v1\/track\/open\/)[^>]*>/gi;
const MANUAL_OPEN_TRACK_TAG_REGEX = /<img\b[^>]*(?:data-track-manual-open\s*=\s*["']?1["']?|\/api\/v1\/track\/manual\/)[^>]*>/gi;
const BODY_CLOSE_REGEX = /<\/body>/i;

const appendBeforeBody = (html, tag) => {
  if (BODY_CLOSE_REGEX.test(html)) {
    return html.replace(BODY_CLOSE_REGEX, `${tag}</body>`);
  }
  return `${html}${tag}`;
};

const injectOpenPixel = (html = '', campaignId, trackingId, baseOverride) => {
  if (!campaignId || !trackingId) return html;
  const baseUrl = getBaseUrl(baseOverride).replace(/\/$/, '');
  const pixelUrl = `${baseUrl}/api/v1/track/open/${encodeURIComponent(campaignId)}/${encodeURIComponent(trackingId)}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" data-track-open="1" />`;
  const htmlWithoutOldPixels = String(html || '').replace(OPEN_TRACK_TAG_REGEX, '');
  if (!htmlWithoutOldPixels) return pixelTag;
  return appendBeforeBody(htmlWithoutOldPixels, pixelTag);
};

const injectManualOpenPixel = (html = '', trackingId, baseOverride) => {
  if (!trackingId) return html || '';
  const baseUrl = getBaseUrl(baseOverride).replace(/\/$/, '');
  const pixelUrl = `${baseUrl}/api/v1/track/manual/${encodeURIComponent(trackingId)}`;
  const pixelTag = `<img src="${pixelUrl}" width="1" height="1" style="display:none;opacity:0" alt="" data-track-manual-open="1" />`;
  const htmlWithoutOldPixels = String(html || '').replace(MANUAL_OPEN_TRACK_TAG_REGEX, '');
  if (!htmlWithoutOldPixels) return pixelTag;
  return appendBeforeBody(htmlWithoutOldPixels, pixelTag);
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

module.exports = {
  injectOpenPixel,
  injectManualOpenPixel,
  wrapClickTracking,
  createTrackingId,
  getBaseUrl,
  signClickTarget
};
