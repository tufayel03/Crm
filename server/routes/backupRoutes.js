const express = require('express');
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { exportBackup, importBackup } = require('../controllers/backupController');
const asyncHandler = require('../utils/asyncHandler');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }
});

router.use(protect, authorize('admin', 'manager'));

router.get('/export', asyncHandler(exportBackup));
router.post('/import', upload.single('file'), asyncHandler(importBackup));

module.exports = router;
