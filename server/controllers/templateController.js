const EmailTemplate = require('../models/EmailTemplate');

const DEFAULT_TEMPLATES = [
  {
    name: 'Invoice Notification',
    subject: 'Invoice {{invoice_id}} from {{company_name}}',
    htmlContent: '<p>Dear {{client_name}},</p><p>Your invoice {{invoice_id}} is ready.</p>',
    createdBy: 'System'
  },
  {
    name: 'Meeting Scheduled',
    subject: 'Meeting Scheduled: {{meeting_title}}',
    htmlContent: '<p>Hi {{participant_name}},</p><p>Your meeting is scheduled for {{date}} at {{time}}.</p>',
    createdBy: 'System'
  },
  {
    name: 'Meeting Updated',
    subject: 'Updated: {{meeting_title}}',
    htmlContent: '<p>Hi {{participant_name}},</p><p>Your meeting has been updated. New time: {{time}} on {{date}}.</p>',
    createdBy: 'System'
  },
  {
    name: 'Meeting Cancelled',
    subject: 'Cancelled: {{meeting_title}}',
    htmlContent: '<p>Hi {{participant_name}},</p><p>Your meeting {{meeting_title}} has been cancelled.</p>',
    createdBy: 'System'
  }
];

exports.getTemplates = async (req, res) => {
  let templates = await EmailTemplate.find({}).sort({ createdAt: -1 });
  if (templates.length === 0) {
    await EmailTemplate.insertMany(DEFAULT_TEMPLATES);
    templates = await EmailTemplate.find({}).sort({ createdAt: -1 });
  }
  res.json(templates);
};

exports.createTemplate = async (req, res) => {
  const template = await EmailTemplate.create(req.body);
  res.status(201).json(template);
};

exports.updateTemplate = async (req, res) => {
  const template = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json(template);
};

exports.deleteTemplate = async (req, res) => {
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found' });
  res.json({ message: 'Template removed' });
};

