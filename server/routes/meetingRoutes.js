const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getMeetings, getMyMeetings, createMeeting, updateMeeting, deleteMeeting } = require('../controllers/meetingController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);
router.get('/me', authorize('admin', 'manager', 'agent', 'client'), asyncHandler(getMyMeetings));
router.use(authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('meetings', 'view'), asyncHandler(getMeetings))
  .post(requirePermission('meetings', 'manage'), asyncHandler(createMeeting));

router.route('/:id')
  .patch(requirePermission('meetings', 'manage'), asyncHandler(updateMeeting))
  .delete(requirePermission('meetings', 'manage'), asyncHandler(deleteMeeting));

module.exports = router;
