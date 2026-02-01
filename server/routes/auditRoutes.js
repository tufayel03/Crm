const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLogs, addLog, clearLogs } = require('../controllers/auditController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);

router.route('/')
  .get(asyncHandler(getLogs))
  .post(asyncHandler(addLog))
  .delete(asyncHandler(clearLogs));

module.exports = router;

