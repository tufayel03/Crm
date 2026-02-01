const Meeting = require('../models/Meeting');

exports.getMeetings = async (req, res) => {
  const meetings = await Meeting.find({}).sort({ createdAt: -1 });
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

