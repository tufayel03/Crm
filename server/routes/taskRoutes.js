const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getTasks, createTask, updateTask, deleteTask } = require('../controllers/taskController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.route('/')
  .get(asyncHandler(getTasks))
  .post(asyncHandler(createTask));

router.route('/:id')
  .patch(asyncHandler(updateTask))
  .delete(asyncHandler(deleteTask));

module.exports = router;

