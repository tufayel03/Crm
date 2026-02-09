const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getTasks, createTask, updateTask, deleteTask, deleteCompletedTasks } = require('../controllers/taskController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('tasks', 'view'), asyncHandler(getTasks))
  .post(requirePermission('tasks', 'manage'), asyncHandler(createTask));

router.route('/completed')
  .delete(requirePermission('tasks', 'manage'), asyncHandler(deleteCompletedTasks));

router.route('/:id')
  .patch(requirePermission('tasks', 'manage'), asyncHandler(updateTask))
  .delete(requirePermission('tasks', 'manage'), asyncHandler(deleteTask));

module.exports = router;
