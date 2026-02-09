const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { sendEmail, getEmailAccounts } = require('../controllers/emailController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.get('/accounts', requirePermission('mailbox', 'view'), asyncHandler(getEmailAccounts));
router.post('/send', asyncHandler(sendEmail));

module.exports = router;
