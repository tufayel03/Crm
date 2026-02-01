const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getMessages, syncNow, clearMessages } = require('../controllers/mailboxController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);
router.get('/messages', asyncHandler(getMessages));
router.post('/sync', asyncHandler(syncNow));
router.delete('/messages', asyncHandler(clearMessages));

module.exports = router;
