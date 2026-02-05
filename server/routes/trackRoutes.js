const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { open, click, manualOpen } = require('../controllers/trackController');

const router = express.Router();

router.get('/open/:campaignId/:trackingId', asyncHandler(open));
router.get('/manual/:trackingId', asyncHandler(manualOpen));
router.get('/click/:campaignId/:trackingId', asyncHandler(click));

module.exports = router;
