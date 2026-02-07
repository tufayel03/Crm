const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignBatch } = require('../controllers/campaignController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager'));

router.route('/')
  .get(asyncHandler(getCampaigns))
  .post(asyncHandler(createCampaign));

router.route('/:id')
  .patch(asyncHandler(updateCampaign))
  .delete(asyncHandler(deleteCampaign));

router.post('/:id/send', asyncHandler(sendCampaignBatch));

module.exports = router;