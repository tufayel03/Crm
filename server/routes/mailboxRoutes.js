const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getMessages, syncNow, clearMessages, updateMessage, deleteMessage, debugSent } = require('../controllers/mailboxController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));
router.get('/debug-sent', authorize('admin', 'manager'), asyncHandler(debugSent));
router.get('/messages', asyncHandler(getMessages));
router.patch('/messages/:id', asyncHandler(updateMessage));
router.post('/sync', asyncHandler(syncNow));
router.delete('/messages', asyncHandler(clearMessages));
router.delete('/messages/:id', asyncHandler(deleteMessage));

module.exports = router;
