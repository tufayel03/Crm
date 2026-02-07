const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask, deleteCompletedTasks } = require('../controllers/taskController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(asyncHandler(getTasks))
  .post(asyncHandler(createTask));

router.route('/completed')
  .delete(asyncHandler(deleteCompletedTasks));

router.route('/:id')
  .patch(asyncHandler(updateTask))
  .delete(asyncHandler(deleteTask));

module.exports = router;