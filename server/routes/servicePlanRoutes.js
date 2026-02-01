const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getPlans, createPlan, updatePlan, deletePlan } = require('../controllers/servicePlanController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.route('/')
  .get(asyncHandler(getPlans))
  .post(authorize('admin', 'manager'), asyncHandler(createPlan));

router.route('/:id')
  .patch(authorize('admin', 'manager'), asyncHandler(updatePlan))
  .delete(authorize('admin', 'manager'), asyncHandler(deletePlan));

module.exports = router;
