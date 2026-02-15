const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { listFiles, uploadFile, deleteFile, bulkDelete, downloadFiles } = require('../controllers/fileManagerController');

const router = express.Router();
const uploadMaxMb = parseInt(process.env.FILE_UPLOAD_MAX_MB || '100', 10);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: uploadMaxMb * 1024 * 1024, files: 1 }
});

router.use(protect, authorize('admin', 'manager'));

router.get('/', asyncHandler(listFiles));
router.post('/upload', upload.single('file'), asyncHandler(uploadFile));
router.delete('/', asyncHandler(deleteFile));
router.delete('/bulk-delete', asyncHandler(bulkDelete));
router.post('/download', asyncHandler(downloadFiles));

module.exports = router;
