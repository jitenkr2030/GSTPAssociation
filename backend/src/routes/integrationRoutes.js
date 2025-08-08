const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  gstnIntegration,
  accountingIntegration,
  paymentIntegration,
  bankingIntegration
} = require('../services/integrationService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateGSTIN = [
  body('gstin').isLength({ min: 15, max: 15 }).withMessage('GSTIN must be 15 characters long')
    .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format')
];

const validateAccountingConnection = [
  body('softwareType').isIn(['tally', 'quickbooks', 'zoho', 'sage']).withMessage('Invalid software type'),
  body('credentials').isObject().withMessage('Credentials must be an object')
];

const validatePaymentData = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('currency').optional().isIn(['INR', 'USD']).withMessage('Invalid currency'),
  body('gateway').optional().isIn(['razorpay', 'stripe', 'payu', 'ccavenue', 'instamojo']).withMessage('Invalid gateway')
];

const validateUPIPayment = [
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be greater than 0'),
  body('upiId').optional().matches(/^[\w.-]+@[\w.-]+$/).withMessage('Invalid UPI ID format'),
  body('provider').optional().isIn(['phonepe', 'googlepay', 'paytm', 'bhim']).withMessage('Invalid UPI provider')
];

const validateBankAccount = [
  body('accountNumber').isLength({ min: 9, max: 18 }).withMessage('Invalid account number length'),
  body('ifscCode').matches(/^[A-Z]{4}0[A-Z0-9]{6}$/).withMessage('Invalid IFSC code format')
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

// GSTN Portal Integration Routes
// @route   POST /api/integrations/gstn/validate-gstin
// @desc    Validate GSTIN with GSTN portal
// @access  Private
router.post('/gstn/validate-gstin', authMiddleware, validateGSTIN, handleValidationErrors, async (req, res) => {
  try {
    const { gstin } = req.body;
    const result = await gstnIntegration.validateGSTIN(gstin);
    
    res.json({
      success: true,
      validation: result
    });
  } catch (error) {
    console.error('GSTIN validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error validating GSTIN'
    });
  }
});

// @route   POST /api/integrations/gstn/file-return
// @desc    File GST return through GSTN portal
// @access  Private
router.post('/gstn/file-return', authMiddleware, async (req, res) => {
  try {
    const returnData = req.body;
    returnData.userId = req.user.id;
    
    const result = await gstnIntegration.fileGSTReturn(returnData);
    
    if (result.success) {
      // Update return status in database
      // Implementation would update GSTReturn model
      
      res.json({
        success: true,
        message: 'GST return filed successfully',
        acknowledgmentNumber: result.acknowledgmentNumber,
        referenceId: result.referenceId
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to file GST return'
      });
    }
  } catch (error) {
    console.error('GST return filing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error filing GST return'
    });
  }
});

// @route   POST /api/integrations/gstn/generate-eway-bill
// @desc    Generate E-Way Bill through GSTN portal
// @access  Private
router.post('/gstn/generate-eway-bill', authMiddleware, async (req, res) => {
  try {
    const eWayBillData = req.body;
    eWayBillData.userId = req.user.id;
    
    const result = await gstnIntegration.generateEWayBill(eWayBillData);
    
    if (result.success) {
      // Save E-Way Bill to database
      // Implementation would save to EWayBill model
      
      res.json({
        success: true,
        message: 'E-Way Bill generated successfully',
        ewbNo: result.ewbNo,
        ewbDate: result.ewbDate,
        validUpto: result.validUpto
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.error || 'Failed to generate E-Way Bill'
      });
    }
  } catch (error) {
    console.error('E-Way Bill generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating E-Way Bill'
    });
  }
});

// @route   GET /api/integrations/gstn/return-status
// @desc    Get GST return status from GSTN portal
// @access  Private
router.get('/gstn/return-status', authMiddleware, [
  query('gstin').isLength({ min: 15, max: 15 }).withMessage('Invalid GSTIN'),
  query('returnPeriod').matches(/^(0[1-9]|1[0-2])[0-9]{4}$/).withMessage('Invalid return period format (MMYYYY)'),
  query('returnType').isIn(['GSTR1', 'GSTR2', 'GSTR3B', 'GSTR9']).withMessage('Invalid return type')
], handleValidationErrors, async (req, res) => {
  try {
    const { gstin, returnPeriod, returnType } = req.query;
    const status = await gstnIntegration.getReturnStatus(gstin, returnPeriod, returnType);
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Return status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking return status'
    });
  }
});

// Accounting Software Integration Routes
// @route   POST /api/integrations/accounting/connect
// @desc    Connect to accounting software
// @access  Private
router.post('/accounting/connect', authMiddleware, validateAccountingConnection, handleValidationErrors, async (req, res) => {
  try {
    const { softwareType, credentials } = req.body;
    const userId = req.user.id;
    
    const result = await accountingIntegration.connectSoftware(userId, softwareType, credentials);
    
    res.json(result);
  } catch (error) {
    console.error('Accounting software connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error connecting to accounting software'
    });
  }
});

// @route   POST /api/integrations/accounting/sync
// @desc    Sync data from accounting software
// @access  Private
router.post('/accounting/sync', authMiddleware, [
  body('dataType').optional().isIn(['all', 'invoices', 'purchases', 'customers']).withMessage('Invalid data type')
], handleValidationErrors, async (req, res) => {
  try {
    const userId = req.user.id;
    const { dataType = 'all' } = req.body;
    
    const result = await accountingIntegration.syncData(userId, dataType);
    
    res.json(result);
  } catch (error) {
    console.error('Data sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing data from accounting software'
    });
  }
});

// Enhanced Payment Gateway Routes
// @route   POST /api/integrations/payment/process
// @desc    Process payment through selected gateway
// @access  Private
router.post('/payment/process', authMiddleware, validatePaymentData, handleValidationErrors, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await paymentIntegration.processPayment(paymentData, req.body.gateway);
    
    res.json({
      success: true,
      payment: result
    });
  } catch (error) {
    console.error('Payment processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment'
    });
  }
});

// @route   POST /api/integrations/payment/recurring
// @desc    Setup recurring payment
// @access  Private
router.post('/payment/recurring', authMiddleware, async (req, res) => {
  try {
    const subscriptionData = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await paymentIntegration.setupRecurringPayment(subscriptionData, req.body.gateway);
    
    res.json({
      success: true,
      subscription: result
    });
  } catch (error) {
    console.error('Recurring payment setup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up recurring payment'
    });
  }
});

// @route   POST /api/integrations/payment/refund
// @desc    Process payment refund
// @access  Private
router.post('/payment/refund', authMiddleware, [
  body('paymentId').notEmpty().withMessage('Payment ID is required'),
  body('amount').isFloat({ min: 1 }).withMessage('Refund amount must be greater than 0'),
  body('reason').optional().isString().withMessage('Reason must be a string')
], handleValidationErrors, async (req, res) => {
  try {
    const { paymentId, amount, gateway = 'razorpay' } = req.body;
    
    const result = await paymentIntegration.refundPayment(paymentId, amount, gateway);
    
    res.json({
      success: true,
      refund: result
    });
  } catch (error) {
    console.error('Refund processing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing refund'
    });
  }
});

// Banking & UPI Integration Routes
// @route   POST /api/integrations/upi/initiate
// @desc    Initiate UPI payment
// @access  Private
router.post('/upi/initiate', authMiddleware, validateUPIPayment, handleValidationErrors, async (req, res) => {
  try {
    const paymentData = {
      ...req.body,
      userId: req.user.id
    };
    
    const result = await bankingIntegration.initiateUPIPayment(paymentData, req.body.provider);
    
    res.json({
      success: true,
      payment: result
    });
  } catch (error) {
    console.error('UPI payment initiation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error initiating UPI payment'
    });
  }
});

// @route   GET /api/integrations/upi/verify/:transactionId
// @desc    Verify UPI payment status
// @access  Private
router.get('/upi/verify/:transactionId', authMiddleware, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { provider = 'phonepe' } = req.query;
    
    const result = await bankingIntegration.verifyUPIPayment(transactionId, provider);
    
    res.json({
      success: true,
      verification: result
    });
  } catch (error) {
    console.error('UPI payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying UPI payment'
    });
  }
});

// @route   POST /api/integrations/banking/verify-account
// @desc    Verify bank account details
// @access  Private
router.post('/banking/verify-account', authMiddleware, validateBankAccount, handleValidationErrors, async (req, res) => {
  try {
    const { accountNumber, ifscCode } = req.body;
    
    const result = await bankingIntegration.getBankAccountDetails(accountNumber, ifscCode);
    
    res.json({
      success: true,
      verification: result
    });
  } catch (error) {
    console.error('Bank account verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying bank account'
    });
  }
});

// @route   GET /api/integrations/status
// @desc    Get integration status for user
// @access  Private
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('integrations');
    
    const integrationStatus = {
      accounting: user.integrations?.accounting || { connected: false },
      gstn: { connected: true }, // GSTN is always available
      payment: { connected: true }, // Payment gateways are always available
      banking: { connected: true } // Banking verification is always available
    };
    
    res.json({
      success: true,
      integrations: integrationStatus
    });
  } catch (error) {
    console.error('Integration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching integration status'
    });
  }
});

module.exports = router;
