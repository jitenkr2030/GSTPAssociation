const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { processGSTQuery } = require('../services/aiService');
const { 
  predictTaxLiability, 
  verifyDocument, 
  getComplianceAnalytics 
} = require('../services/complianceService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateChatQuery = [
  body('query').trim().isLength({ min: 1, max: 1000 }).withMessage('Query must be between 1 and 1000 characters'),
  body('context').optional().isObject().withMessage('Context must be an object')
];

const validateDocumentVerification = [
  body('documentType').isIn(['gst_return', 'eway_bill', 'invoice']).withMessage('Invalid document type'),
  body('documentData').isObject().withMessage('Document data is required')
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

// AI Chatbot Routes
// @route   POST /api/ai/chat
// @desc    Process GST query through AI chatbot
// @access  Public (basic queries) / Private (personalized queries)
router.post('/chat', validateChatQuery, handleValidationErrors, processGSTQuery);

// Predictive Analytics Routes
// @route   GET /api/ai/predict/tax-liability
// @desc    Predict future tax liability
// @access  Private
router.get('/predict/tax-liability', authMiddleware, [
  query('period').optional().isString().withMessage('Period must be a string'),
  query('projectionMonths').optional().isInt({ min: 1, max: 12 }).withMessage('Projection months must be between 1 and 12')
], handleValidationErrors, predictTaxLiability);

// Document Verification Routes
// @route   POST /api/ai/verify/document
// @desc    Verify and detect errors in documents
// @access  Private
router.post('/verify/document', authMiddleware, validateDocumentVerification, handleValidationErrors, verifyDocument);

// Compliance Analytics Routes
// @route   GET /api/ai/analytics/compliance
// @desc    Get compliance analytics and insights
// @access  Private
router.get('/analytics/compliance', authMiddleware, [
  query('period').optional().isIn(['3months', '6months', '12months']).withMessage('Invalid period')
], handleValidationErrors, getComplianceAnalytics);

module.exports = router;
