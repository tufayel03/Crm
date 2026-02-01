const express = require('express');
const router = express.Router();
const { login, register, me, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

router.post('/login', asyncHandler(login));
router.post('/register', protect, authorize('admin', 'manager'), asyncHandler(register));
router.get('/me', protect, asyncHandler(me));
router.post('/forgot', asyncHandler(forgotPassword));
router.post('/reset', asyncHandler(resetPassword));

module.exports = router;
