const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMessages, syncNow, clearMessages, updateMessage } = require('../controllers/mailboxController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);
router.get('/messages', asyncHandler(getMessages));
router.patch('/messages/:id', asyncHandler(updateMessage));
router.post('/sync', asyncHandler(syncNow));
router.delete('/messages', asyncHandler(clearMessages));

module.exports = router;
