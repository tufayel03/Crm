const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getUsers, createUser, updateUser, updatePassword, deleteUser } = require('../controllers/userController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.route('/')
  .get(authorize('admin', 'manager'), requirePermission('team', 'view'), asyncHandler(getUsers))
  .post(authorize('admin', 'manager'), requirePermission('team', 'manage'), asyncHandler(createUser));

router.route('/:id')
  .patch(authorize('admin', 'manager'), requirePermission('team', 'manage'), asyncHandler(updateUser))
  .delete(authorize('admin', 'manager'), requirePermission('team', 'manage'), asyncHandler(deleteUser));

router.patch('/:id/password', authorize('admin', 'manager'), requirePermission('team', 'manage'), asyncHandler(updatePassword));

module.exports = router;
