const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getSettings, getPermissions, updateSettings, requestIpReset, confirmIpReset } = require('../controllers/settingsController');
const asyncHandler = require('../utils/asyncHandler');

router.post('/ip-reset/request', asyncHandler(requestIpReset));
router.get('/ip-reset/confirm', asyncHandler(confirmIpReset));

router.use(protect);
router.get('/permissions', authorize('admin', 'manager', 'agent'), asyncHandler(getPermissions));

router.route('/')
  .get(authorize('admin', 'manager', 'agent'), requirePermission('settings', 'view'), asyncHandler(getSettings))
  .patch(authorize('admin', 'manager', 'agent'), requirePermission('settings', 'manage'), asyncHandler(updateSettings));

module.exports = router;
