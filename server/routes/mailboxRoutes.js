const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getMessages, syncNow, clearMessages, updateMessage, deleteMessage, debugSent } = require('../controllers/mailboxController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));
router.get('/debug-sent', authorize('admin', 'manager'), asyncHandler(debugSent));
router.get('/messages', requirePermission('mailbox', 'view'), asyncHandler(getMessages));
router.patch('/messages/:id', requirePermission('mailbox', 'manage'), asyncHandler(updateMessage));
router.post('/sync', requirePermission('mailbox', 'manage'), asyncHandler(syncNow));
router.delete('/messages', requirePermission('mailbox', 'manage'), asyncHandler(clearMessages));
router.delete('/messages/:id', requirePermission('mailbox', 'manage'), asyncHandler(deleteMessage));

module.exports = router;
