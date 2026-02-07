const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { getPayments, createPayment, updatePayment, deletePayment, bulkDeletePayments, sendInvoiceEmail } = require('../controllers/paymentController');
const asyncHandler = require('../utils/asyncHandler');

router.use(protect, authorize('admin', 'manager', 'agent'));

router.route('/')
  .get(asyncHandler(getPayments))
  .post(asyncHandler(createPayment))
  .delete(asyncHandler(bulkDeletePayments));

router.route('/:id')
  .patch(asyncHandler(updatePayment))
  .delete(asyncHandler(deletePayment));

router.post('/:id/send-invoice', asyncHandler(sendInvoiceEmail));

module.exports = router;