const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getTemplates, createTemplate, updateTemplate, deleteTemplate } = require('../controllers/templateController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(asyncHandler(getTemplates))
  .post(asyncHandler(createTemplate));

router.route('/:id')
  .patch(asyncHandler(updateTemplate))
  .delete(asyncHandler(deleteTemplate));

module.exports = router;