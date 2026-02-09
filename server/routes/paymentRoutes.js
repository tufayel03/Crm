const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permission');
const { getPayments, getMyPayments, createPayment, updatePayment, deletePayment, bulkDeletePayments, sendInvoiceEmail } = require('../controllers/paymentController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect);
router.get('/me', authorize('admin', 'manager', 'agent', 'client'), asyncHandler(getMyPayments));
router.use(authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(requirePermission('payments', 'view'), asyncHandler(getPayments))
  .post(requirePermission('payments', 'manage'), asyncHandler(createPayment))
  .delete(requirePermission('payments', 'manage'), asyncHandler(bulkDeletePayments));

router.route('/:id')
  .patch(requirePermission('payments', 'manage'), asyncHandler(updatePayment))
  .delete(requirePermission('payments', 'manage'), asyncHandler(deletePayment));

router.post('/:id/send-invoice', requirePermission('payments', 'manage'), asyncHandler(sendInvoiceEmail));

module.exports = router;
