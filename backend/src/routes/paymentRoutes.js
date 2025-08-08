const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  createStripePaymentIntent,
  createRazorpayOrder,
  confirmPayment,
  getUserSubscriptions,
  cancelSubscription,
  processPayment,
  getPaymentDetails
} = require('../services/paymentService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validatePaymentIntent = [
  body('membershipId').isMongoId().withMessage('Valid membership ID is required'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
  body('couponCode').optional().isString().withMessage('Coupon code must be a string')
];

const validatePaymentConfirmation = [
  body('membershipId').isMongoId().withMessage('Valid membership ID is required'),
  body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Billing cycle must be monthly or yearly'),
  body('paymentMethod').isIn(['stripe', 'razorpay']).withMessage('Invalid payment method'),
  body('paymentIntentId').optional().isString().withMessage('Payment intent ID must be a string'),
  body('razorpayPaymentId').optional().isString().withMessage('Razorpay payment ID must be a string'),
  body('razorpayOrderId').optional().isString().withMessage('Razorpay order ID must be a string'),
  body('razorpaySignature').optional().isString().withMessage('Razorpay signature must be a string')
];

const validateSubscriptionCancellation = [
  body('reason').optional().isString().withMessage('Cancellation reason must be a string')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/payments/stripe/create-intent
// @desc    Create Stripe payment intent
// @access  Private
router.post('/stripe/create-intent', authMiddleware, validatePaymentIntent, handleValidationErrors, createStripePaymentIntent);

// @route   POST /api/payments/razorpay/create-order
// @desc    Create Razorpay order
// @access  Private
router.post('/razorpay/create-order', authMiddleware, validatePaymentIntent, handleValidationErrors, createRazorpayOrder);

// @route   POST /api/payments/confirm
// @desc    Confirm payment and create subscription
// @access  Private
router.post('/confirm', authMiddleware, validatePaymentConfirmation, handleValidationErrors, confirmPayment);

// @route   GET /api/payments/subscriptions
// @desc    Get user subscriptions
// @access  Private
router.get('/subscriptions', authMiddleware, getUserSubscriptions);

// @route   POST /api/payments/subscriptions/:subscriptionId/cancel
// @desc    Cancel subscription
// @access  Private
router.post('/subscriptions/:subscriptionId/cancel', authMiddleware, validateSubscriptionCancellation, handleValidationErrors, cancelSubscription);

// Legacy routes for backward compatibility
// @route   POST /api/payments/process
// @desc    Process a payment (legacy)
// @access  Private
router.post('/process', authMiddleware, async (req, res) => {
  try {
    const result = await processPayment(req.body);
    res.json({
      success: true,
      payment: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error processing payment'
    });
  }
});

// @route   GET /api/payments/:id
// @desc    Get payment details by ID (legacy)
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const payment = await getPaymentDetails(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    res.json({
      success: true,
      payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
});

module.exports = router;
