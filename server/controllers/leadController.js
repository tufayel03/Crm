const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { getNextSequence } = require('../utils/counter');
const { generateUniqueShortId } = require('../utils/ids');

const CONVERTED_STATUSES = ['Converted', 'Closed Won'];

const ensureClientForLead = async (lead) => {
  if (!lead) return;
  const existing = await Client.findOne({ $or: [{ leadId: lead._id }, lead.email ? { email: lead.email } : null].filter(Boolean) });
  if (existing) return;

  const readableId = await getNextSequence('client');
  const uniqueId = lead.shortId || await generateUniqueShortId(Client, 'uniqueId');

  await Client.create({
    readableId,
    uniqueId,
    leadId: lead._id,
    companyName: lead.name,
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
};

exports.getLeads = async (req, res) => {
  const filter = {};
  if (req.user && req.user.role === 'agent') {
    filter.assignedAgentId = req.user.id;
  }
  const leads = await Lead.find(filter).sort({ createdAt: -1 });
  res.json(leads);
};

exports.createLead = async (req, res) => {
  const { name, profession, email, phone, country, assignedAgentId, assignedAgentName, status, source } = req.body;
  if (!name) return res.status(400).json({ message: 'Name is required' });

  const or = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  const leadExists = or.length ? await Lead.findOne({ $or: or }) : null;
  if (leadExists) {
    return res.status(400).json({ message: 'Lead already exists with this email or phone' });
  }

  const readableId = await getNextSequence('lead');
  const shortId = await generateUniqueShortId(Lead, 'shortId');

  const lead = await Lead.create({
    readableId,
    shortId,
    name,
    profession: profession || '',
    email,
    phone,
    country,
    status: status || 'New',
    assignedAgentId: assignedAgentId || '',
    assignedAgentName: assignedAgentName || 'Unassigned',
    isRevealed: false,
    source
  });

  res.status(201).json(lead);
};

exports.updateLead = async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  if (req.body && req.body.status && CONVERTED_STATUSES.includes(req.body.status)) {
    await ensureClientForLead(lead);
  }
  res.json(lead);
};

exports.deleteLeads = async (req, res) => {
  const { ids } = req.body;
  await Lead.deleteMany({ _id: { $in: ids } });
  res.json({ message: 'Leads removed' });
};

exports.addNote = async (req, res) => {
  const { content, author } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  lead.notes.push({
    id: Math.random().toString(36).substring(2, 9),
    content,
    author,
    timestamp: new Date()
  });
  await lead.save();
  res.json(lead);
};

exports.updateNote = async (req, res) => {
  const { content, author } = req.body;
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  const note = (lead.notes || []).find(n => n.id === req.params.noteId);
  if (!note) return res.status(404).json({ message: 'Note not found' });
  note.content = content;
  if (author) note.author = author;
  note.timestamp = new Date();
  await lead.save();
  res.json(lead);
};

exports.deleteNote = async (req, res) => {
  const lead = await Lead.findById(req.params.id);
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  lead.notes = (lead.notes || []).filter(n => n.id !== req.params.noteId);
  await lead.save();
  res.json(lead);
};

exports.revealContact = async (req, res) => {
  const lead = await Lead.findByIdAndUpdate(req.params.id, { isRevealed: true }, { new: true });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  res.json(lead);
};

exports.bulkAssign = async (req, res) => {
  const { ids, agentId, agentName } = req.body;
  await Lead.updateMany({ _id: { $in: ids } }, { assignedAgentId: agentId, assignedAgentName: agentName });
  res.json({ message: 'Leads assigned' });
};

exports.bulkStatusUpdate = async (req, res) => {
  const { ids, status } = req.body;
  await Lead.updateMany({ _id: { $in: ids } }, { status });
  if (CONVERTED_STATUSES.includes(status)) {
    const leads = await Lead.find({ _id: { $in: ids } });
    for (const lead of leads) {
      await ensureClientForLead(lead);
    }
  }
  res.json({ message: 'Leads updated' });
};

exports.importLeads = async (req, res) => {
  const { leads } = req.body;
  if (!Array.isArray(leads)) return res.status(400).json({ message: 'Invalid leads payload' });

  const duplicates = [];
  const created = [];

  for (const data of leads) {
    const email = data.email ? String(data.email).toLowerCase().trim() : '';
    const phone = data.phone ? String(data.phone).replace(/\D/g, '') : '';
    if (!email && !phone) continue;

    const exists = await Lead.findOne({
      $or: [
        email ? { email } : null,
        phone ? { phone: new RegExp(phone) } : null
      ].filter(Boolean)
    });

    if (exists) {
      duplicates.push({ ...data, duplicate_reason: 'Email or phone exists' });
      continue;
    }

    const readableId = await getNextSequence('lead');
    const shortId = data.shortId ? String(data.shortId).toUpperCase() : await generateUniqueShortId(Lead, 'shortId');

    const lead = await Lead.create({
      readableId,
      shortId,
      name: data.name || 'Unknown',
      profession: data.profession || data.jobTitle || '',
      email: data.email || '',
      phone: data.phone || '',
      country: data.country || '',
      status: data.status || 'New',
      assignedAgentId: data.assignedAgentId || '',
      assignedAgentName: data.assignedAgentName || 'Unassigned',
      isRevealed: false,
      notes: data.note ? [{ id: Math.random().toString(36).substring(2, 9), content: data.note, author: 'Import System', timestamp: new Date() }] : []
    });

    created.push(lead);
  }

  res.json({ added: created.length, duplicates });
};

