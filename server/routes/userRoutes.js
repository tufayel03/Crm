const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getUsers, createUser, updateUser, updatePassword, deleteUser } = require('../controllers/userController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'manager'), asyncHandler(getUsers))
  .post(authorize('admin', 'manager'), asyncHandler(createUser));

router.route('/:id')
  .patch(authorize('admin', 'manager'), asyncHandler(updateUser))
  .delete(authorize('admin', 'manager'), asyncHandler(deleteUser));

router.patch('/:id/password', authorize('admin', 'manager'), asyncHandler(updatePassword));

module.exports = router;

