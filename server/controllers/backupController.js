const JSZip = require('jszip');
const mongoose = require('mongoose');

const AuditLog = require('../models/AuditLog');
const Campaign = require('../models/Campaign');
const Client = require('../models/Client');
const Counter = require('../models/Counter');
const EmailTemplate = require('../models/EmailTemplate');
const Lead = require('../models/Lead');
const MailMessage = require('../models/MailMessage');
const Meeting = require('../models/Meeting');
const Payment = require('../models/Payment');
const ServicePlan = require('../models/ServicePlan');
const Settings = require('../models/Settings');
const Task = require('../models/Task');
const User = require('../models/User');

const collections = [
  { name: 'users', model: User },
  { name: 'settings', model: Settings },
  { name: 'leads', model: Lead },
  { name: 'clients', model: Client },
  { name: 'payments', model: Payment },
  { name: 'tasks', model: Task },
  { name: 'meetings', model: Meeting },
  { name: 'campaigns', model: Campaign },
  { name: 'templates', model: EmailTemplate },
  { name: 'mail', model: MailMessage },
  { name: 'services', model: ServicePlan },
  { name: 'counters', model: Counter },
  { name: 'audit', model: AuditLog }
];

const buildMetadata = () => ({
  version: '2.0',
  exportedAt: new Date().toISOString(),
  app: 'Matlance CRM',
  collections: collections.map(c => c.name)
});

const safeParse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const toPlain = (doc) => {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') {
    return doc.toObject({ depopulate: true, getters: false, virtuals: false });
  }
  return doc;
};

exports.exportBackup = async (req, res) => {
  const requestedCollections = req.query && req.query.collections ? safeParse(req.query.collections) : null;
  const exportCollections = Array.isArray(requestedCollections) && requestedCollections.length > 0
    ? requestedCollections
    : collections.map(c => c.name);

  const zip = new JSZip();
  const payload = {};

  for (const { name, model } of collections) {
    if (!exportCollections.includes(name)) continue;
    const docs = await model.find({}).lean({ virtuals: false });
    payload[name] = docs.map(toPlain);
    zip.file(`${name}.json`, JSON.stringify(payload[name], null, 2));
  }

  const meta = { ...buildMetadata(), collections: exportCollections };
  zip.file('metadata.json', JSON.stringify(meta, null, 2));

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `Matlance_Full_Backup_${timestamp}.zip`;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', content.length);
  res.send(content);
};

exports.importBackup = async (req, res) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ message: 'No backup file uploaded.' });
  }

  const mode = req.query.mode === 'replace' ? 'replace' : 'merge';
  const zip = await JSZip.loadAsync(req.file.buffer);

  const metaFile = zip.file('metadata.json');
  if (!metaFile) {
    return res.status(400).json({ message: 'Invalid backup file. Missing metadata.json.' });
  }

  const metaText = await metaFile.async('string');
  const metadata = safeParse(metaText) || {};
  const requestedCollections = req.body && req.body.collections ? safeParse(req.body.collections) : null;
  const collectionNames = Array.isArray(requestedCollections) && requestedCollections.length > 0
    ? requestedCollections
    : (Array.isArray(metadata.collections) ? metadata.collections : collections.map(c => c.name));

  const stripTimestamps = (item) => {
    if (!item || typeof item !== 'object') return item;
    const cleaned = { ...item };
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    delete cleaned.__v;
    return cleaned;
  };

  const uniqueKeysByCollection = {
    users: ['email'],
    settings: ['_singleton'],
    leads: ['shortId', 'email'],
    clients: ['uniqueId', 'email'],
    payments: ['invoiceId'],
    services: ['name'],
    templates: ['name'],
    counters: ['name'],
    mail: ['accountId+imapUid', 'messageId'],
  };

  const getUniqueQuery = (collectionName, item) => {
    const keys = uniqueKeysByCollection[collectionName] || [];
    for (const key of keys) {
      if (key === '_singleton') {
        return { _singleton: true };
      }
      if (key === 'accountId+imapUid') {
        if (item.accountId && typeof item.imapUid !== 'undefined') {
          return { accountId: item.accountId, imapUid: item.imapUid };
        }
        continue;
      }
      const value = item[key];
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        if (key === 'email') {
          return { [key]: String(value).toLowerCase().trim() };
        }
        return { [key]: value };
      }
    }
    return null;
  };

  const mergeCollection = async (collectionName, model, data, session) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const options = session ? { session } : {};

    if (collectionName === 'settings') {
      const exists = await model.exists({}, options);
      if (exists) return;
    }

    let added = 0;
    let skipped = 0;
    for (const item of data) {
      if (!item || typeof item !== 'object') continue;

      const cleanedItem = stripTimestamps(item);
      const uniqueQuery = getUniqueQuery(collectionName, cleanedItem);
      if (uniqueQuery && uniqueQuery._singleton) {
        const exists = await model.exists({}, options);
        if (exists) { skipped += 1; continue; }
      } else if (uniqueQuery) {
        const existsByUnique = await model.exists(uniqueQuery, options);
        if (existsByUnique) { skipped += 1; continue; }
      }

      if (cleanedItem._id) {
        await model.updateOne(
          { _id: cleanedItem._id },
          { $setOnInsert: cleanedItem },
          { upsert: true, timestamps: false, ...options }
        );
        added += 1;
        continue;
      }

      await model.create([cleanedItem], options);
      added += 1;
    }
    return { added, skipped };
  };

  const merge = async (session) => {
    const summary = {};
    for (const { name, model } of collections) {
      if (!collectionNames.includes(name)) continue;
      const file = zip.file(`${name}.json`);
      if (!file) continue;

      const text = await file.async('string');
      const data = safeParse(text);
      if (!Array.isArray(data) || data.length === 0) continue;

      const result = await mergeCollection(name, model, data, session);
      if (result) summary[name] = result;
    }
    return summary;
  };

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    if (mode === 'replace') {
      for (const { name, model } of collections) {
        if (!collectionNames.includes(name)) continue;
        await model.deleteMany({}, { session });
      }
    }
    const summary = await merge(session);
    await session.commitTransaction();
    session.endSession();
    return res.json({ message: mode === 'replace' ? 'Database replaced successfully.' : 'Database merged successfully.', summary });
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // ignore
      }
      session.endSession();
    }

    const message = err && err.message ? err.message : 'Restore failed.';
    if (String(message).includes('Transaction numbers are only allowed')) {
      try {
        if (mode === 'replace') {
          for (const { name, model } of collections) {
            if (!collectionNames.includes(name)) continue;
            await model.deleteMany({});
          }
        }
        const summary = await merge(null);
        return res.json({ message: mode === 'replace' ? 'Database replaced successfully.' : 'Database merged successfully.', summary });
      } catch (retryErr) {
        return res.status(500).json({ message: retryErr.message || 'Restore failed.' });
      }
    }

    return res.status(500).json({ message });
  }
};
