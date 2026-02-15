const Lead = require('../models/Lead');
const Client = require('../models/Client');
const { getNextSequence } = require('../utils/counter');
const { generateUniqueShortId } = require('../utils/ids');
const { logActivity } = require('../utils/activityLogger');

const CONVERTED_STATUSES = ['Converted', 'Closed Won'];
const AGENT_ROLE = 'agent';

const getLeadScope = (req) => {
  if (req.user && req.user.role === AGENT_ROLE) {
    return { assignedAgentId: req.user.id };
  }
  return {};
};

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
  const filter = getLeadScope(req);
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

  const normalizedAssignedAgentId = req.user && req.user.role === AGENT_ROLE
    ? req.user.id
    : (assignedAgentId || '');
  const normalizedAssignedAgentName = req.user && req.user.role === AGENT_ROLE
    ? req.user.name
    : (assignedAgentName || 'Unassigned');

  const lead = await Lead.create({
    readableId,
    shortId,
    name,
    profession: profession || '',
    email,
    phone,
    country,
    status: status || 'New',
    assignedAgentId: normalizedAssignedAgentId,
    assignedAgentName: normalizedAssignedAgentName,
    isRevealed: false,
    source
  });

  await logActivity(req, {
    action: 'lead.created',
    module: 'leads',
    targetType: 'lead',
    targetId: lead._id,
    details: `Lead created: ${lead.name} (${lead.email || 'no-email'})`
  });

  res.status(201).json(lead);
};

exports.updateLead = async (req, res) => {
  const filter = { _id: req.params.id, ...getLeadScope(req) };
  const updates = { ...(req.body || {}) };
  if (req.user && req.user.role === AGENT_ROLE) {
    delete updates.assignedAgentId;
    delete updates.assignedAgentName;
  }
  const lead = await Lead.findOneAndUpdate(filter, updates, { new: true });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  if (req.body && req.body.status && CONVERTED_STATUSES.includes(req.body.status)) {
    await ensureClientForLead(lead);
  }
  await logActivity(req, {
    action: 'lead.updated',
    module: 'leads',
    targetType: 'lead',
    targetId: lead._id,
    details: `Lead updated: ${lead.name} (${lead.status})`
  });
  res.json(lead);
};

exports.deleteLeads = async (req, res) => {
  const { ids } = req.body;
  const result = await Lead.deleteMany({ _id: { $in: ids }, ...getLeadScope(req) });
  await logActivity(req, {
    action: 'lead.deleted',
    module: 'leads',
    targetType: 'lead',
    details: `Deleted ${result.deletedCount || 0} lead(s)`
  });
  res.json({ message: 'Leads removed', deletedCount: result.deletedCount || 0 });
};

exports.addNote = async (req, res) => {
  const { content, author } = req.body;
  const lead = await Lead.findOne({ _id: req.params.id, ...getLeadScope(req) });
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
  const lead = await Lead.findOne({ _id: req.params.id, ...getLeadScope(req) });
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
  const lead = await Lead.findOne({ _id: req.params.id, ...getLeadScope(req) });
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  lead.notes = (lead.notes || []).filter(n => n.id !== req.params.noteId);
  await lead.save();
  res.json(lead);
};

exports.revealContact = async (req, res) => {
  const lead = await Lead.findOneAndUpdate(
    { _id: req.params.id, ...getLeadScope(req) },
    { isRevealed: true },
    { new: true }
  );
  if (!lead) return res.status(404).json({ message: 'Lead not found' });
  res.json(lead);
};

exports.bulkAssign = async (req, res) => {
  const { ids, agentId, agentName } = req.body;
  await Lead.updateMany({ _id: { $in: ids } }, { assignedAgentId: agentId, assignedAgentName: agentName });
  await logActivity(req, {
    action: 'lead.bulk_assign',
    module: 'leads',
    targetType: 'lead',
    details: `Assigned ${Array.isArray(ids) ? ids.length : 0} lead(s) to ${agentName || agentId || 'Unassigned'}`
  });
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
  await logActivity(req, {
    action: 'lead.bulk_status',
    module: 'leads',
    targetType: 'lead',
    details: `Updated status to "${status}" for ${Array.isArray(ids) ? ids.length : 0} lead(s)`
  });
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

    const emailExists = email ? await Lead.findOne({ email }) : null;
    const phoneExists = !emailExists && phone ? await Lead.findOne({ phone: new RegExp(phone) }) : null;

    if (emailExists || phoneExists) {
      const reason = emailExists ? `Email exists: ${email}` : `Phone exists: ${phone}`;
      duplicates.push({ ...data, duplicate_reason: reason, serial: data.serial });
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

  await logActivity(req, {
    action: 'lead.imported',
    module: 'leads',
    targetType: 'lead',
    details: `Lead import completed. Added: ${created.length}, duplicates: ${duplicates.length}`
  });

  res.json({ added: created.length, duplicates });
};
