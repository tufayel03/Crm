const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMessages, syncNow, clearMessages, updateMessage, debugSent } = require('../controllers/mailboxController');
const asyncHandler = require('../utils/asyncHandler');

// Public debug route
router.get('/debug-sent', asyncHandler(debugSent));

router.use(protect);
router.get('/messages', asyncHandler(getMessages));
router.patch('/messages/:id', asyncHandler(updateMessage));
router.post('/sync', asyncHandler(syncNow));
router.delete('/messages', asyncHandler(clearMessages));
// router.get('/debug-sent', asyncHandler(debugSent)); // Removed from here

module.exports = router;
