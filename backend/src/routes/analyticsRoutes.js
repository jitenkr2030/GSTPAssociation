const express = require('express');
const { query, validationResult } = require('express-validator');
const {
  getUserDashboard,
  getGSTFilingStatus,
  getBusinessComplianceScore,
  getTaxLiabilitySummary,
  generateAnalyticsReport,
  updateAnalyticsData
} = require('../services/analyticsService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validatePeriodQuery = [
  query('period').optional().isIn(['current', 'previous', 'ytd', 'quarterly', 'yearly']).withMessage('Invalid period'),
  query('year').optional().isInt({ min: 2017, max: 2030 }).withMessage('Year must be between 2017 and 2030'),
  query('quarter').optional().isInt({ min: 1, max: 4 }).withMessage('Quarter must be between 1 and 4')
];

const validateReportQuery = [
  query('reportType').optional().isIn(['comprehensive', 'compliance', 'financial', 'filing']).withMessage('Invalid report type'),
  query('period').optional().isIn(['weekly', 'monthly', 'quarterly', 'yearly']).withMessage('Invalid period'),
  query('format').optional().isIn(['json', 'pdf', 'excel']).withMessage('Invalid format')
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

// Dashboard Routes
// @route   GET /api/analytics/dashboard
// @desc    Get comprehensive user dashboard with all metrics
// @access  Private
router.get('/dashboard', authMiddleware, getUserDashboard);

// @route   GET /api/analytics/gst-filing-status
// @desc    Get detailed GST filing status and performance
// @access  Private
router.get('/gst-filing-status', authMiddleware, validatePeriodQuery, handleValidationErrors, getGSTFilingStatus);

// @route   GET /api/analytics/compliance-score
// @desc    Get business compliance score with breakdown and recommendations
// @access  Private
router.get('/compliance-score', authMiddleware, getBusinessComplianceScore);

// @route   GET /api/analytics/tax-liability
// @desc    Get comprehensive tax liability summary and projections
// @access  Private
router.get('/tax-liability', authMiddleware, validatePeriodQuery, handleValidationErrors, getTaxLiabilitySummary);

// @route   GET /api/analytics/reports
// @desc    Generate and download analytics reports
// @access  Private
router.get('/reports', authMiddleware, validateReportQuery, handleValidationErrors, generateAnalyticsReport);

// @route   POST /api/analytics/update
// @desc    Force update analytics data
// @access  Private
router.post('/update', authMiddleware, updateAnalyticsData);

module.exports = router;
