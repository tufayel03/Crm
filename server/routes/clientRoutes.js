const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
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
  .get(asyncHandler(getClients))
  .post(asyncHandler(createClient))
  .delete(asyncHandler(deleteClients));

router.post('/convert', asyncHandler(convertLeadToClient));
router.post('/import', authorize('admin', 'manager'), asyncHandler(importClients));

router.route('/:id')
  .patch(asyncHandler(updateClient));

router.post('/:id/services', asyncHandler(addService));
router.patch('/:id/services', asyncHandler(updateService));
router.delete('/:id/services', asyncHandler(removeService));

router.post('/:id/notes', asyncHandler(addNote));
router.patch('/:id/notes/:noteId', asyncHandler(updateNote));
router.delete('/:id/notes/:noteId', asyncHandler(deleteNote));
router.post('/:id/documents', asyncHandler(addDocument));
router.post('/:id/upload', upload.single('file'), asyncHandler(uploadDocument));
router.delete('/:id/documents', asyncHandler(removeDocument));
router.patch('/:id/wallet', asyncHandler(updateWallet));

module.exports = router;
