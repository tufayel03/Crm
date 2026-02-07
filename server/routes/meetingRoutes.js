const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getMeetings, createMeeting, updateMeeting, deleteMeeting } = require('../controllers/meetingController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(asyncHandler(getMeetings))
  .post(asyncHandler(createMeeting));

router.route('/:id')
  .patch(asyncHandler(updateMeeting))
  .delete(asyncHandler(deleteMeeting));

module.exports = router;