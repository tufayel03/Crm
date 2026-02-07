const express = require('express');
const router = express.Router();
const { login, register, registerClient, me, forgotPassword, resetPassword, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/limiter');
const asyncHandler = require('../utils/asyncHandler');

router.post('/login', authLimiter, asyncHandler(login));
router.post('/register', protect, authorize('admin', 'manager'), asyncHandler(register));
router.post('/register-client', authLimiter, asyncHandler(registerClient));
router.get('/me', protect, asyncHandler(me));
router.post('/forgot', authLimiter, asyncHandler(forgotPassword));
router.post('/reset', authLimiter, asyncHandler(resetPassword));
router.post('/change-password', protect, asyncHandler(changePassword));

module.exports = router;
