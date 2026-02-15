const EmailTemplate = require('../models/EmailTemplate');
const { logActivity } = require('../utils/activityLogger');

const DEFAULT_TEMPLATES = [
  {
    name: 'Meeting Scheduled',
    subject: 'Meeting Scheduled: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: {
        backgroundColor: '#F1F5F9',
        contentWidth: 600,
        contentBackgroundColor: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    name: 'Meeting Updated',
    subject: 'Updated: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: {
        backgroundColor: '#F1F5F9',
        contentWidth: 600,
        contentBackgroundColor: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    name: 'Meeting Cancelled',
    subject: 'Cancelled: {{meeting_title}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: {
        backgroundColor: '#F1F5F9',
        contentWidth: 600,
        contentBackgroundColor: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    name: 'Invoice Alert',
    subject: 'Invoice {{invoice_id}} from {{company_name}}',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: {
        backgroundColor: '#F1F5F9',
        contentWidth: 600,
        contentBackgroundColor: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      blocks: []
    }),
    createdBy: 'System'
  },
  {
    name: 'Invoice Reminder',
    subject: 'Reminder: Invoice {{invoice_id}} is due',
    htmlContent: '',
    designJson: JSON.stringify({
      globalStyle: {
        backgroundColor: '#F1F5F9',
        contentWidth: 600,
        contentBackgroundColor: '#FFFFFF',
        fontFamily: 'Arial, Helvetica, sans-serif'
      },
      blocks: []
    }),
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
  await logActivity(req, {
    action: 'template.created',
    module: 'templates',
    targetType: 'template',
    targetId: template._id,
    details: `Template created: ${template.name || 'Untitled'}`
  });
  res.status(201).json(template);
};

exports.updateTemplate = async (req, res) => {
  const template = await EmailTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) return res.status(404).json({ message: 'Template not found' });
  await logActivity(req, {
    action: 'template.updated',
    module: 'templates',
    targetType: 'template',
    targetId: template._id,
    details: `Template updated: ${template.name || 'Untitled'}`
  });
  res.json(template);
};

exports.deleteTemplate = async (req, res) => {
  const template = await EmailTemplate.findByIdAndDelete(req.params.id);
  if (!template) return res.status(404).json({ message: 'Template not found' });
  await logActivity(req, {
    action: 'template.deleted',
    module: 'templates',
    targetType: 'template',
    targetId: template._id,
    details: `Template deleted: ${template.name || 'Untitled'}`
  });
  res.json({ message: 'Template removed' });
};
