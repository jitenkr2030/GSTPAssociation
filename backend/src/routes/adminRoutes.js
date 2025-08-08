const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  getDashboardStats,
  getUsers,
  getAllUsers,
  deleteUser,
  moderateForumPost,
  updateSettings
} = require('../services/adminService');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateUserUpdate = [
  body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  body('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),
  body('membershipType').optional().isIn(['free', 'basic', 'premium', 'elite']).withMessage('Invalid membership type')
];

const validateForumModeration = [
  body('action').isIn(['approve', 'delete', 'reject']).withMessage('Invalid action'),
  body('reason').optional().isString().withMessage('Reason must be a string')
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
// @route   GET /api/admin/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private (Admin only)
router.get('/dashboard/stats', authMiddleware, adminMiddleware, [
  query('period').optional().isIn(['7days', '30days', '90days', '1year']).withMessage('Invalid period')
], handleValidationErrors, getDashboardStats);

// User Management Routes
// @route   GET /api/admin/users
// @desc    Get users with filtering and pagination
// @access  Private (Admin only)
router.get('/users', authMiddleware, adminMiddleware, [
  query('search').optional().isString().withMessage('Search must be a string'),
  query('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),
  query('membershipType').optional().isIn(['free', 'basic', 'premium', 'elite']).withMessage('Invalid membership type'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative'),
  query('sort').optional().isIn(['createdAt', 'name', 'email', 'lastLoginAt']).withMessage('Invalid sort field')
], handleValidationErrors, getUsers);

// @route   DELETE /api/admin/users/:id
// @desc    Delete a user by ID (Admin only)
// @access  Private (Admin only)
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await deleteUser(req.params.id);
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error deleting user'
    });
  }
});

// Content Moderation Routes
// @route   POST /api/admin/moderate/forum/:postId
// @desc    Moderate a forum post (Admin only)
// @access  Private (Admin only)
router.post('/moderate/forum/:postId', authMiddleware, adminMiddleware, validateForumModeration, handleValidationErrors, async (req, res) => {
  try {
    const result = await moderateForumPost(req.params.postId, req.body.action);
    res.json({
      success: true,
      message: `Post ${req.body.action}ed successfully`,
      post: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error moderating post'
    });
  }
});

// System Settings Routes
// @route   PUT /api/admin/settings
// @desc    Update system settings (Admin only)
// @access  Private (Admin only)
router.put('/settings', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const result = await updateSettings(req.body);
    res.json({
      success: true,
      message: 'Settings updated successfully',
      settings: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Error updating settings'
    });
  }
});

// Legacy route for backward compatibility
// @route   GET /api/admin/users/all
// @desc    Get all users (legacy)
// @access  Private (Admin only)
router.get('/users/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json({
      success: true,
      users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
});

module.exports = router;
