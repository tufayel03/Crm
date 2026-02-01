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
  const zip = new JSZip();
  const payload = {};

  for (const { name, model } of collections) {
    const docs = await model.find({}).lean({ virtuals: false });
    payload[name] = docs.map(toPlain);
    zip.file(`${name}.json`, JSON.stringify(payload[name], null, 2));
  }

  const meta = buildMetadata();
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

  const zip = await JSZip.loadAsync(req.file.buffer);

  const metaFile = zip.file('metadata.json');
  if (!metaFile) {
    return res.status(400).json({ message: 'Invalid backup file. Missing metadata.json.' });
  }

  const metaText = await metaFile.async('string');
  const metadata = safeParse(metaText) || {};
  const collectionNames = Array.isArray(metadata.collections)
    ? metadata.collections
    : collections.map(c => c.name);

  const stripTimestamps = (item) => {
    if (!item || typeof item !== 'object') return item;
    const cleaned = { ...item };
    delete cleaned.createdAt;
    delete cleaned.updatedAt;
    delete cleaned.__v;
    return cleaned;
  };

  const mergeCollection = async (model, data, session) => {
    if (!Array.isArray(data) || data.length === 0) return;

    const options = session ? { session } : {};

    for (const item of data) {
      if (!item || typeof item !== 'object') continue;

      const cleanedItem = stripTimestamps(item);
      const email = cleanedItem.email ? String(cleanedItem.email).toLowerCase().trim() : null;
      if (email) {
        const existsByEmail = await model.exists({ email }, options);
        if (existsByEmail) continue;
      }

      if (cleanedItem._id) {
        await model.updateOne(
          { _id: cleanedItem._id },
          { $setOnInsert: cleanedItem },
          { upsert: true, timestamps: false, ...options }
        );
        continue;
      }

      await model.create([cleanedItem], options);
    }
  };

  const merge = async (session) => {
    for (const { name, model } of collections) {
      if (!collectionNames.includes(name)) continue;
      const file = zip.file(`${name}.json`);
      if (!file) continue;

      const text = await file.async('string');
      const data = safeParse(text);
      if (!Array.isArray(data) || data.length === 0) continue;

      await mergeCollection(model, data, session);
    }
  };

  let session = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    await merge(session);
    await session.commitTransaction();
    session.endSession();
    return res.json({ message: 'Database merged successfully.' });
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
        await merge(null);
        return res.json({ message: 'Database merged successfully.' });
      } catch (retryErr) {
        return res.status(500).json({ message: retryErr.message || 'Restore failed.' });
      }
    }

    return res.status(500).json({ message });
  }
};
