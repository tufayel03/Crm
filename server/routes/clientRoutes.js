const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const asyncHandler = require('../utils/asyncHandler');
const {
  getClients,
  getMyClient,
  createClient,
  updateClient,
  deleteClients,
  convertLeadToClient,
  addService,
  updateService,
  removeService,
  addNote,
  updateNote,
  deleteNote,
  addDocument,
  uploadDocument,
  removeDocument,
  updateWallet,
  importClients
} = require('../controllers/clientController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

router.use(protect);
router.get('/me', authorize('admin', 'manager', 'agent', 'client'), asyncHandler(getMyClient));
router.use(authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('clients', 'view'), asyncHandler(getClients))
  .post(requirePermission('clients', 'manage'), asyncHandler(createClient))
  .delete(requirePermission('clients', 'manage'), asyncHandler(deleteClients));

router.post('/convert', requirePermission('clients', 'manage'), asyncHandler(convertLeadToClient));
router.post('/import', authorize('admin', 'manager'), requirePermission('clients', 'manage'), asyncHandler(importClients));

router.route('/:id')
  .patch(requirePermission('clients', 'manage'), asyncHandler(updateClient));

router.post('/:id/services', requirePermission('clients', 'manage'), asyncHandler(addService));
router.patch('/:id/services', requirePermission('clients', 'manage'), asyncHandler(updateService));
router.delete('/:id/services', requirePermission('clients', 'manage'), asyncHandler(removeService));

router.post('/:id/notes', requirePermission('clients', 'manage'), asyncHandler(addNote));
router.patch('/:id/notes/:noteId', requirePermission('clients', 'manage'), asyncHandler(updateNote));
router.delete('/:id/notes/:noteId', requirePermission('clients', 'manage'), asyncHandler(deleteNote));
router.post('/:id/documents', requirePermission('clients', 'manage'), asyncHandler(addDocument));
router.post('/:id/upload', requirePermission('clients', 'manage'), upload.single('file'), asyncHandler(uploadDocument));
router.delete('/:id/documents', requirePermission('clients', 'manage'), asyncHandler(removeDocument));
router.patch('/:id/wallet', requirePermission('clients', 'manage'), asyncHandler(updateWallet));

module.exports = router;
