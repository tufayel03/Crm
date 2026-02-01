const ServicePlan = require('../models/ServicePlan');

exports.getPlans = async (req, res) => {
  const plans = await ServicePlan.find({}).sort({ createdAt: -1 });
  res.json(plans);
};

exports.createPlan = async (req, res) => {
  const { name, price, duration } = req.body;
  if (!name || price === undefined || duration === undefined) {
    return res.status(400).json({ message: 'Name, price, and duration required' });
  }
  const plan = await ServicePlan.create(req.body);
  res.status(201).json(plan);
};

exports.updatePlan = async (req, res) => {
  const plan = await ServicePlan.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!plan) return res.status(404).json({ message: 'Service plan not found' });
  res.json(plan);
};

exports.deletePlan = async (req, res) => {
  const plan = await ServicePlan.findByIdAndDelete(req.params.id);
  if (!plan) return res.status(404).json({ message: 'Service plan not found' });
  res.json({ message: 'Service plan removed' });
};
