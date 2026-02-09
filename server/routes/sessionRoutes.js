const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { getSessions, revokeSession } = require('../controllers/sessionController');

router.use(protect, authorize('admin', 'manager', 'agent'));
router.get('/', asyncHandler(getSessions));
router.delete('/:id', asyncHandler(revokeSession));

module.exports = router;
