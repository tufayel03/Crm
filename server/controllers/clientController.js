const Client = require('../models/Client');
const Lead = require('../models/Lead');
const path = require('path');
const fs = require('fs/promises');
const { getNextSequence } = require('../utils/counter');
const { generateUniqueShortId } = require('../utils/ids');
const { uploadToS3, deleteFromS3, isS3Configured } = require('../utils/s3');

const ensureClientUniqueIds = async () => {
  // Backfill uniqueId from legacy shortId, then remove shortId
  await Client.collection.updateMany(
    { uniqueId: { $exists: false }, shortId: { $exists: true } },
    [{ $set: { uniqueId: '$shortId' } }, { $unset: 'shortId' }]
  );
};

exports.getClients = async (req, res) => {
  await ensureClientUniqueIds();
  const clients = await Client.find({}).sort({ createdAt: -1 });
  res.json(clients);
};

exports.getMyClient = async (req, res) => {
  const normalizedEmail = String(req.user?.email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'User email not found' });
  }

  let client = await Client.findOne({ email: normalizedEmail });
  if (!client) {
    client = await Client.findOne({
      email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    });
  }
  if (!client) {
    client = await Client.findOne({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: '$email' } } },
          normalizedEmail
        ]
      }
    });
  }

  if (!client) {
    return res.status(404).json({ message: 'No client profile linked to this account' });
  }

  res.json(client);
};

exports.createClient = async (req, res) => {
  const { companyName, contactName, profession, email, leadId } = req.body;
  if (!contactName) return res.status(400).json({ message: 'Contact name is required' });

  if (email) {
    const exists = await Client.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Client already exists with this email' });
  }

  const readableId = await getNextSequence('client');
  const uniqueId = await generateUniqueShortId(Client, 'uniqueId');

  const payload = { ...req.body };
  if (!leadId) delete payload.leadId;

  const client = await Client.create({
    ...payload,
    profession: profession || payload.profession || '',
    readableId,
    uniqueId,
    walletBalance: req.body.walletBalance || 0
  });

  res.status(201).json(client);
};

exports.updateClient = async (req, res) => {
  const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!client) return res.status(404).json({ message: 'Client not found' });
  res.json(client);
};

exports.deleteClients = async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.json({ message: 'Clients removed' });
  }

  const clients = await Client.find({ _id: { $in: ids } });

  for (const client of clients) {
    const allDocs = [
      ...(client.documents || []),
      ...(client.invoices || [])
    ];

    for (const doc of allDocs) {
      if (doc && doc.key) {
        await deleteFromS3(doc.key);
      }
      if (doc && doc.localPath) {
        const fullPath = path.join(__dirname, '..', 'uploads', doc.localPath);
        try {
          await fs.unlink(fullPath);
        } catch {
          // ignore missing files
        }
      }
    }
  }

  await Client.deleteMany({ _id: { $in: ids } });
  res.json({ message: 'Clients removed' });
};

exports.convertLeadToClient = async (req, res) => {
  const { leadId, companyName } = req.body;
  const lead = await Lead.findById(leadId);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  const existing = await Client.findOne({ $or: [{ leadId: lead._id }, lead.email ? { email: lead.email } : null].filter(Boolean) });
  if (existing) return res.status(200).json(existing);

  const readableId = await getNextSequence('client');
  const uniqueId = lead.shortId || await generateUniqueShortId(Client, 'uniqueId');

  const client = await Client.create({
    readableId,
    uniqueId,
    leadId: lead._id,
    companyName: companyName || lead.name,
    contactName: lead.name,
    profession: lead.profession || '',
    email: lead.email,
    phone: lead.phone,
    country: lead.country,
    accountManagerId: lead.assignedAgentId,
    accountManagerName: lead.assignedAgentName,
    services: [],
    onboardedAt: new Date(),
    walletBalance: 0,
    invoices: [],
    documents: [],
    notes: lead.notes || []
  });

  res.status(201).json(client);
};

exports.addService = async (req, res) => {
  const { service } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  client.services.push(service);
  await client.save();
  res.json(client);
};

exports.updateService = async (req, res) => {
  const { serviceId, updates } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  client.services = client.services.map(s => {
    const base = typeof s.toObject === 'function' ? s.toObject() : s;
    return s.id === serviceId ? { ...base, ...updates } : s;
  });
  await client.save();
  res.json(client);
};

exports.removeService = async (req, res) => {
  const { serviceId } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  client.services = client.services.filter(s => s.id !== serviceId);
  await client.save();
  res.json(client);
};

exports.addNote = async (req, res) => {
  const { content, author } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  client.notes.push({ id: Math.random().toString(36).substring(2, 9), content, author, timestamp: new Date() });
  await client.save();
  res.json(client);
};

exports.updateNote = async (req, res) => {
  const { content, author } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  const note = (client.notes || []).find(n => n.id === req.params.noteId);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.content = content;
  if (author) note.author = author;
  note.timestamp = new Date();
  await client.save();
  res.json(client);
};

exports.deleteNote = async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  client.notes = (client.notes || []).filter(n => n.id !== req.params.noteId);
  await client.save();
  res.json(client);
};

exports.addDocument = async (req, res) => {
  const { document } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  if (document.category === 'invoice') {
    client.invoices.unshift(document);
  } else {
    client.documents.unshift(document);
  }
  await client.save();
  res.json(client);
};

exports.uploadDocument = async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  if (!req.file) return res.status(400).json({ message: 'File required' });

  const category = req.body.category || 'contract';
  const safeName = String(req.file.originalname || 'file').replace(/[^\w.\-]+/g, '_');

  let upload = null;
  let localPath = null;
  let publicUrl = null;
  let key = null;

  if (isS3Configured()) {
    key = `clients/${client.id}/${category}/${Date.now()}-${safeName}`;
    upload = await uploadToS3({ buffer: req.file.buffer, contentType: req.file.mimetype, key });
    publicUrl = upload.url;
  } else {
    const uploadRoot = path.join(__dirname, '..', 'uploads');
    const relativePath = path.join('clients', client.id, category, `${Date.now()}-${safeName}`);
    const fullPath = path.join(uploadRoot, relativePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, req.file.buffer);
    localPath = relativePath.replace(/\\/g, '/');
    publicUrl = `${req.protocol}://${req.get('host')}/uploads/${localPath}`;
  }

  const newDoc = {
    id: Math.random().toString(36).substring(2, 9),
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
    url: publicUrl,
    key: upload ? upload.key : null,
    localPath,
    uploadDate: new Date(),
    category
  };

  if (category === 'invoice') {
    client.invoices.unshift(newDoc);
  } else {
    client.documents.unshift(newDoc);
  }

  await client.save();
  res.json(client);
};

exports.removeDocument = async (req, res) => {
  const { documentId, category } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });

  const list = category === 'invoice' ? client.invoices : client.documents;
  const doc = list.find(d => d.id === documentId);

  if (doc && doc.key) {
    await deleteFromS3(doc.key);
  }
  if (doc && doc.localPath) {
    const fullPath = path.join(__dirname, '..', 'uploads', doc.localPath);
    try {
      await fs.unlink(fullPath);
    } catch {
      // ignore missing files
    }
  }

  if (category === 'invoice') {
    client.invoices = client.invoices.filter(d => d.id !== documentId);
  } else {
    client.documents = client.documents.filter(d => d.id !== documentId);
  }
  await client.save();
  res.json(client);
};

exports.updateWallet = async (req, res) => {
  const { amount, operation } = req.body;
  const client = await Client.findById(req.params.id);
  if (!client) return res.status(404).json({ message: 'Client not found' });
  let balance = client.walletBalance || 0;
  if (operation === 'credit') balance += amount;
  if (operation === 'debit') balance -= amount;
  if (operation === 'set') balance = amount;
  client.walletBalance = balance;
  await client.save();
  res.json(client);
};

exports.importClients = async (req, res) => {
  const { clients } = req.body;
  if (!Array.isArray(clients)) return res.status(400).json({ message: 'Invalid clients payload' });

  const duplicates = [];
  const created = [];

  for (const data of clients) {
    const email = data.email ? String(data.email).toLowerCase().trim() : '';
    const phone = data.phone ? String(data.phone).replace(/\D/g, '') : '';
    if (!email && !phone) continue;

    const emailExists = email ? await Client.findOne({ email }) : null;
    const phoneExists = !emailExists && phone ? await Client.findOne({ phone: new RegExp(phone) }) : null;

    if (emailExists || phoneExists) {
      const reason = emailExists ? `Email exists: ${email}` : `Phone exists: ${phone}`;
      duplicates.push({ ...data, duplicate_reason: reason, serial: data.serial });
      continue;
    }

    const readableId = await getNextSequence('client');
    const incomingUniqueId = data.uniqueId || data.uniqueID || data.shortId;
    const uniqueId = incomingUniqueId ? String(incomingUniqueId).toUpperCase() : await generateUniqueShortId(Client, 'uniqueId');

    const client = await Client.create({
      readableId,
      uniqueId,
      leadId: '',
      companyName: data.companyName || data.shopName || '',
      contactName: data.contactName || data.name || 'Unknown',
      profession: data.profession || data.jobTitle || '',
      email: data.email || '',
      phone: data.phone || '',
      country: data.country || '',
      accountManagerId: data.accountManagerId || 'unassigned',
      accountManagerName: data.accountManagerName || 'Unassigned',
      services: [],
      onboardedAt: new Date(),
      walletBalance: 0,
      invoices: [],
      documents: [],
      notes: data.note ? [{ id: Math.random().toString(36).substring(2, 9), content: data.note, author: 'Import System', timestamp: new Date() }] : []
    });

    created.push(client);
  }

  res.json({ added: created.length, duplicates });
};
