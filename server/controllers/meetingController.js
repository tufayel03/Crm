const Meeting = require('../models/Meeting');
const Client = require('../models/Client');

exports.getMeetings = async (req, res) => {
  const meetings = await Meeting.find({}).sort({ createdAt: -1 });
  res.json(meetings);
};

exports.getMyMeetings = async (req, res) => {
  const normalizedEmail = String(req.user?.email || '').toLowerCase().trim();
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'User email not found' });
  }

  let client = await Client.findOne({ email: normalizedEmail }).select('_id leadId');
  if (!client) {
    client = await Client.findOne({
      email: { $regex: `^${normalizedEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
    }).select('_id leadId');
  }
  if (!client) {
    client = await Client.findOne({
      $expr: {
        $eq: [
          { $toLower: { $trim: { input: '$email' } } },
          normalizedEmail
        ]
      }
    }).select('_id leadId');
  }

  if (!client) return res.json([]);

  const clientId = String(client._id);
  const leadId = client.leadId ? String(client.leadId) : null;
  const leadObjectId = leadId && /^[a-f0-9]{24}$/i.test(leadId) ? client.leadId : null;

  const queryIds = [{ leadId: client._id }, { leadId: clientId }];
  if (leadObjectId) queryIds.push({ leadId: leadObjectId });
  if (leadId) queryIds.push({ leadId });

  const meetings = await Meeting.find({
    $or: queryIds
  }).sort({ createdAt: -1 });

  res.json(meetings);
};

exports.createMeeting = async (req, res) => {
  const { title, date } = req.body;
  if (!title || !date) return res.status(400).json({ message: 'Title and date required' });
  const meeting = await Meeting.create(req.body);
  res.status(201).json(meeting);
};

exports.updateMeeting = async (req, res) => {
  const meeting = await Meeting.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json(meeting);
};

exports.deleteMeeting = async (req, res) => {
  const meeting = await Meeting.findByIdAndDelete(req.params.id);
  if (!meeting) return res.status(404).json({ message: 'Meeting not found' });
  res.json({ message: 'Meeting removed' });
};
