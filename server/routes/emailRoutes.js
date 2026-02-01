const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../controllers/emailController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.post('/send', asyncHandler(sendEmail));

module.exports = router;
