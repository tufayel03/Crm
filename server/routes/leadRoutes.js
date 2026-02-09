const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const asyncHandler = require('../utils/asyncHandler');
const {
  getLeads,
  createLead,
  updateLead,
  deleteLeads,
  addNote,
  revealContact,
  bulkAssign,
  bulkStatusUpdate,
  importLeads,
  updateNote,
  deleteNote
} = require('../controllers/leadController');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('leads', 'view'), asyncHandler(getLeads))
  .post(requirePermission('leads', 'manage'), asyncHandler(createLead))
  .delete(requirePermission('leads', 'manage'), asyncHandler(deleteLeads));

router.post('/import', authorize('admin', 'manager'), requirePermission('leads', 'manage'), asyncHandler(importLeads));
router.post('/bulk-assign', authorize('admin', 'manager'), requirePermission('leads', 'manage'), asyncHandler(bulkAssign));
router.post('/bulk-status', authorize('admin', 'manager'), requirePermission('leads', 'manage'), asyncHandler(bulkStatusUpdate));

router.route('/:id')
  .patch(requirePermission('leads', 'manage'), asyncHandler(updateLead));

router.post('/:id/notes', requirePermission('leads', 'manage'), asyncHandler(addNote));
router.patch('/:id/notes/:noteId', requirePermission('leads', 'manage'), asyncHandler(updateNote));
router.delete('/:id/notes/:noteId', requirePermission('leads', 'manage'), asyncHandler(deleteNote));
router.post('/:id/reveal', requirePermission('leads', 'manage'), asyncHandler(revealContact));

module.exports = router;
