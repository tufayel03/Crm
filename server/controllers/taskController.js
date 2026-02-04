const Task = require('../models/Task');

exports.getTasks = async (req, res) => {
  const tasks = await Task.find({}).sort({ createdAt: -1 });
  res.json(tasks);
};

exports.createTask = async (req, res) => {
  const { title, dueDate } = req.body;
  if (!title || !dueDate) return res.status(400).json({ message: 'Title and due date required' });
  const task = await Task.create(req.body);
  res.status(201).json(task);
};

exports.updateTask = async (req, res) => {
  const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json(task);
};

exports.deleteTask = async (req, res) => {
  const task = await Task.findByIdAndDelete(req.params.id);
  if (!task) return res.status(404).json({ message: 'Task not found' });
  res.json({ message: 'Task removed' });
};

exports.deleteCompletedTasks = async (req, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const tasks = await Task.find({
    status: 'completed',
    $or: [{ createdBy: userId }, { assignedTo: userId }]
  }).select('_id');

  const ids = tasks.map(t => t._id.toString());
  if (ids.length === 0) {
    return res.json({ deletedIds: [] });
  }

  await Task.deleteMany({ _id: { $in: ids } });
  res.json({ deletedIds: ids });
};

