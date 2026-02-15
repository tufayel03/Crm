const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getCampaigns, createCampaign, updateCampaign, deleteCampaign, sendCampaignBatch, retryFailedRecipients, retargetUnopenedRecipients } = require('../controllers/campaignController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('campaigns', 'view'), asyncHandler(getCampaigns))
  .post(requirePermission('campaigns', 'manage'), asyncHandler(createCampaign));

router.route('/:id')
  .patch(requirePermission('campaigns', 'manage'), asyncHandler(updateCampaign))
  .delete(requirePermission('campaigns', 'manage'), asyncHandler(deleteCampaign));

router.post('/:id/send', requirePermission('campaigns', 'manage'), asyncHandler(sendCampaignBatch));
router.post('/:id/retry-failed', requirePermission('campaigns', 'manage'), asyncHandler(retryFailedRecipients));
router.post('/:id/retarget-unopened', requirePermission('campaigns', 'manage'), asyncHandler(retargetUnopenedRecipients));

module.exports = router;
