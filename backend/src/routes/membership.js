const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getMembershipPlans,
  getMembershipPlan,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
  getMembershipComparison,
  getMembershipTiers,
  getUserMembershipStatus,
  upgradeMembership
} = require('../services/membershipService');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateMembershipPlan = [
  body('name').isIn(['free', 'basic', 'premium', 'elite']).withMessage('Invalid membership name'),
  body('displayName').trim().isLength({ min: 1, max: 100 }).withMessage('Display name must be between 1 and 100 characters'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description must be between 1 and 500 characters'),
  body('price.monthly').isFloat({ min: 0 }).withMessage('Monthly price must be a positive number'),
  body('price.yearly').isFloat({ min: 0 }).withMessage('Yearly price must be a positive number'),
  body('features').isArray().withMessage('Features must be an array'),
  body('features.*.name').trim().isLength({ min: 1 }).withMessage('Feature name is required'),
  body('features.*.included').isBoolean().withMessage('Feature included must be boolean'),
  body('features.*.limit').optional().isInt({ min: -1 }).withMessage('Feature limit must be -1 or positive integer')
];

const validateMembershipUpdate = [
  body('displayName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Display name must be between 1 and 100 characters'),
  body('description').optional().trim().isLength({ min: 1, max: 500 }).withMessage('Description must be between 1 and 500 characters'),
  body('price.monthly').optional().isFloat({ min: 0 }).withMessage('Monthly price must be a positive number'),
  body('price.yearly').optional().isFloat({ min: 0 }).withMessage('Yearly price must be a positive number'),
  body('features').optional().isArray().withMessage('Features must be an array'),
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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

// @route   GET /api/membership/plans
// @desc    Get all membership plans
// @access  Public
router.get('/plans', getMembershipPlans);

// @route   GET /api/membership/plans/:membershipId
// @desc    Get specific membership plan
// @access  Public
router.get('/plans/:membershipId', getMembershipPlan);

// @route   POST /api/membership/plans
// @desc    Create new membership plan
// @access  Private (Admin only)
router.post('/plans', authMiddleware, adminMiddleware, validateMembershipPlan, handleValidationErrors, createMembershipPlan);

// @route   PUT /api/membership/plans/:membershipId
// @desc    Update membership plan
// @access  Private (Admin only)
router.put('/plans/:membershipId', authMiddleware, adminMiddleware, validateMembershipUpdate, handleValidationErrors, updateMembershipPlan);

// @route   DELETE /api/membership/plans/:membershipId
// @desc    Delete membership plan
// @access  Private (Admin only)
router.delete('/plans/:membershipId', authMiddleware, adminMiddleware, deleteMembershipPlan);

// @route   GET /api/membership/comparison
// @desc    Get membership comparison matrix
// @access  Public
router.get('/comparison', getMembershipComparison);

// Legacy routes for backward compatibility
// @route   GET /api/membership/tiers
// @desc    Get available membership tiers (legacy)
// @access  Public
router.get('/tiers', getMembershipTiers);

// @route   GET /api/membership/status
// @desc    Get current user's membership status
// @access  Private
router.get('/status', authMiddleware, getUserMembershipStatus);

// @route   POST /api/membership/upgrade
// @desc    Upgrade user membership
// @access  Private
router.post('/upgrade', authMiddleware, [
  body('membershipId').isMongoId().withMessage('Valid membership ID is required')
], handleValidationErrors, upgradeMembership);

module.exports = router;
