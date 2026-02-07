const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
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
  .get(asyncHandler(getLeads))
  .post(asyncHandler(createLead))
  .delete(asyncHandler(deleteLeads));

router.post('/import', authorize('admin', 'manager'), asyncHandler(importLeads));
router.post('/bulk-assign', authorize('admin', 'manager'), asyncHandler(bulkAssign));
router.post('/bulk-status', authorize('admin', 'manager'), asyncHandler(bulkStatusUpdate));

router.route('/:id')
  .patch(asyncHandler(updateLead));

router.post('/:id/notes', asyncHandler(addNote));
router.patch('/:id/notes/:noteId', asyncHandler(updateNote));
router.delete('/:id/notes/:noteId', asyncHandler(deleteNote));
router.post('/:id/reveal', asyncHandler(revealContact));

module.exports = router;