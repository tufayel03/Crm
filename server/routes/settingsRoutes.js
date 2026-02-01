const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getSettings, updateSettings, requestIpReset, confirmIpReset } = require('../controllers/settingsController');
const asyncHandler = require('../utils/asyncHandler');

router.post('/ip-reset/request', asyncHandler(requestIpReset));
router.get('/ip-reset/confirm', asyncHandler(confirmIpReset));

router.use(protect);

router.route('/')
  .get(asyncHandler(getSettings))
  .patch(asyncHandler(updateSettings));

module.exports = router;

