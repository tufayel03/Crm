const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const {
  getClients,
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
  storage: multer.memoryStorage()
});

router.use(protect);

router.route('/')
  .get(asyncHandler(getClients))
  .post(asyncHandler(createClient))
  .delete(asyncHandler(deleteClients));

router.post('/convert', asyncHandler(convertLeadToClient));
router.post('/import', asyncHandler(importClients));

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
