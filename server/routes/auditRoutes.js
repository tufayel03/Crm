const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getLogs, addLog, clearLogs, deleteLog } = require('../controllers/auditController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.get('/', authorize('admin', 'manager', 'agent'), requirePermission('activityLogs', 'view'), asyncHandler(getLogs));
router.post('/', authorize('admin', 'manager', 'agent'), asyncHandler(addLog));
router.delete('/', authorize('admin', 'manager', 'agent'), requirePermission('activityLogs', 'manage'), asyncHandler(clearLogs));
router.delete('/:id', authorize('admin', 'manager', 'agent'), requirePermission('activityLogs', 'manage'), asyncHandler(deleteLog));

module.exports = router;
