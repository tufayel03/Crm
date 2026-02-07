const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { sendEmail } = require('../controllers/emailController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.post('/send', asyncHandler(sendEmail));

module.exports = router;