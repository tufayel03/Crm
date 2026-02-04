const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { listFiles, uploadFile, deleteFile, bulkDelete, downloadFiles } = require('../controllers/fileManagerController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(protect, authorize('admin', 'manager'));

router.get('/', asyncHandler(listFiles));
router.post('/upload', upload.single('file'), asyncHandler(uploadFile));
router.delete('/', asyncHandler(deleteFile));
router.delete('/bulk-delete', asyncHandler(bulkDelete));
router.post('/download', asyncHandler(downloadFiles));

module.exports = router;
