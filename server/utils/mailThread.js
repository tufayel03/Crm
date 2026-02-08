const normalizeMessageId = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.replace(/^<|>$/g, '').trim();
};

const parseReferences = (value) => {
  if (!value) return [];

  const rawValues = Array.isArray(value) ? value : [value];
  const normalized = [];
  const seen = new Set();

  for (const raw of rawValues) {
    const parts = String(raw || '').match(/<[^>]+>|[^\s]+/g) || [];
    for (const part of parts) {
      const id = normalizeMessageId(part);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      normalized.push(id);
    }
  }

  return normalized;
};

const formatMessageIdHeader = (value) => {
  const normalized = normalizeMessageId(value);
  if (!normalized) return '';
  return `<${normalized}>`;
};

const cleanSubject = (subject) =>
  String(subject || '')
    .replace(/^\s*((re|fwd)\s*:\s*)+/i, '')
    .trim()
    .toLowerCase();

const buildThreadId = ({ subject, messageId, inReplyTo, references }) => {
  const normalizedReferences = parseReferences(references);
  const normalizedInReplyTo = normalizeMessageId(inReplyTo);
  const normalizedMessageId = normalizeMessageId(messageId);

  if (normalizedReferences.length > 0) return normalizedReferences[0];
  if (normalizedInReplyTo) return normalizedInReplyTo;
  if (normalizedMessageId) return normalizedMessageId;

  const normalizedSubject = cleanSubject(subject);
  if (normalizedSubject) return `subject:${normalizedSubject}`;
  return '';
};

module.exports = {
  normalizeMessageId,
  parseReferences,
  formatMessageIdHeader,
  buildThreadId
};
