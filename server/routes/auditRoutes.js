const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getLogs, addLog, clearLogs } = require('../controllers/auditController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager'));

router.route('/')
  .get(asyncHandler(getLogs))
  .post(asyncHandler(addLog))
  .delete(authorize('admin'), asyncHandler(clearLogs));

module.exports = router;