const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  calculateGST,
  searchHSNCodes,
  getHSNCodeDetails,
  createGSTReturn,
  getUserGSTReturns,
  fileGSTReturn,
  createEWayBill,
  generateEWayBill,
  getUserEWayBills,
  calculateITC,
  calculateTDSTCS,
  getComplianceDashboard
} = require('../services/gstService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateGSTCalculation = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('gstRate').isFloat({ min: 0, max: 50 }).withMessage('GST rate must be between 0 and 50'),
  body('type').optional().isIn(['inclusive', 'exclusive']).withMessage('Type must be inclusive or exclusive'),
  body('hsnCode').optional().matches(/^[0-9]{4,8}$/).withMessage('Invalid HSN code format')
];

const validateGSTReturn = [
  body('gstin').matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GSTIN format'),
  body('returnType').isIn(['GSTR1', 'GSTR2', 'GSTR3B', 'GSTR4', 'GSTR5', 'GSTR6', 'GSTR7', 'GSTR8', 'GSTR9', 'GSTR9C']).withMessage('Invalid return type'),
  body('period.month').isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  body('period.year').isInt({ min: 2017 }).withMessage('Year must be 2017 or later')
];

const validateEWayBill = [
  body('fromGstin').matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid supplier GSTIN format'),
  body('toGstin').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid recipient GSTIN format'),
  body('transactionType').isIn(['Regular', 'Bill To - Ship To', 'Bill From - Dispatch From', 'Combination of 2 and 3']).withMessage('Invalid transaction type'),
  body('docNo').notEmpty().withMessage('Document number is required'),
  body('docDate').isISO8601().withMessage('Invalid document date'),
  body('totalInvoiceValue').isFloat({ min: 0 }).withMessage('Total invoice value must be positive'),
  body('transDistance').isFloat({ min: 0 }).withMessage('Transport distance must be positive')
];

const validateITCCalculation = [
  body('purchases').isArray({ min: 1 }).withMessage('At least one purchase is required'),
  body('purchases.*.amount').isFloat({ min: 0 }).withMessage('Purchase amount must be positive'),
  body('purchases.*.gstRate').isFloat({ min: 0, max: 50 }).withMessage('GST rate must be between 0 and 50'),
  body('purchases.*.category').optional().isIn(['eligible', 'partially_eligible', 'ineligible']).withMessage('Invalid category')
];

const validateTDSTCSCalculation = [
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
  body('type').isIn(['TDS', 'TCS']).withMessage('Type must be TDS or TCS'),
  body('section').isIn(['51', '52']).withMessage('Invalid section'),
  body('supplierType').optional().isIn(['registered', 'unregistered']).withMessage('Invalid supplier type')
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

// GST Calculator Routes
// @route   POST /api/gst/calculate
// @desc    Calculate GST
// @access  Public
router.post('/calculate', validateGSTCalculation, handleValidationErrors, calculateGST);

// @route   POST /api/gst/calculate/itc
// @desc    Calculate Input Tax Credit
// @access  Private
router.post('/calculate/itc', authMiddleware, validateITCCalculation, handleValidationErrors, calculateITC);

// @route   POST /api/gst/calculate/tds-tcs
// @desc    Calculate TDS/TCS
// @access  Private
router.post('/calculate/tds-tcs', authMiddleware, validateTDSTCSCalculation, handleValidationErrors, calculateTDSTCS);

// HSN Code Routes
// @route   GET /api/gst/hsn/search
// @desc    Search HSN codes
// @access  Public
router.get('/hsn/search', [
  query('query').optional().isString().withMessage('Query must be a string'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative'),
  query('category').optional().isIn(['Goods', 'Services']).withMessage('Invalid category'),
  query('gstRate').optional().isFloat({ min: 0, max: 50 }).withMessage('GST rate must be between 0 and 50')
], handleValidationErrors, searchHSNCodes);

// @route   GET /api/gst/hsn/:code
// @desc    Get HSN code details
// @access  Public
router.get('/hsn/:code', getHSNCodeDetails);

// GST Return Routes
// @route   POST /api/gst/returns
// @desc    Create GST return
// @access  Private
router.post('/returns', authMiddleware, validateGSTReturn, handleValidationErrors, createGSTReturn);

// @route   GET /api/gst/returns
// @desc    Get user's GST returns
// @access  Private
router.get('/returns', authMiddleware, [
  query('status').optional().isIn(['draft', 'filed', 'processed', 'rejected', 'amended']).withMessage('Invalid status'),
  query('returnType').optional().isIn(['GSTR1', 'GSTR2', 'GSTR3B', 'GSTR4', 'GSTR5', 'GSTR6', 'GSTR7', 'GSTR8', 'GSTR9', 'GSTR9C']).withMessage('Invalid return type'),
  query('year').optional().isInt({ min: 2017 }).withMessage('Year must be 2017 or later'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative')
], handleValidationErrors, getUserGSTReturns);

// @route   POST /api/gst/returns/:returnId/file
// @desc    File GST return
// @access  Private
router.post('/returns/:returnId/file', authMiddleware, fileGSTReturn);

// E-Way Bill Routes
// @route   POST /api/gst/eway-bills
// @desc    Create E-Way Bill
// @access  Private
router.post('/eway-bills', authMiddleware, validateEWayBill, handleValidationErrors, createEWayBill);

// @route   GET /api/gst/eway-bills
// @desc    Get user's E-Way Bills
// @access  Private
router.get('/eway-bills', authMiddleware, [
  query('status').optional().isIn(['draft', 'generated', 'cancelled', 'expired']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative')
], handleValidationErrors, getUserEWayBills);

// @route   POST /api/gst/eway-bills/:eWayBillId/generate
// @desc    Generate E-Way Bill
// @access  Private
router.post('/eway-bills/:eWayBillId/generate', authMiddleware, generateEWayBill);

// Compliance Dashboard
// @route   GET /api/gst/compliance/dashboard
// @desc    Get compliance dashboard
// @access  Private
router.get('/compliance/dashboard', authMiddleware, getComplianceDashboard);

module.exports = router;
