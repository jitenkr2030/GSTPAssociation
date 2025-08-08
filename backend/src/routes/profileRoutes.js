const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  getProfile,
  updateProfile,
  uploadAvatar,
  updateEmail,
  updateMobile,
  updatePreferences,
  deleteAccount,
  upload
} = require('../services/profileService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateProfileUpdate = [
  body('profile.firstName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),
  body('profile.lastName').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters'),
  body('profile.bio').optional().trim().isLength({ max: 500 }).withMessage('Bio must not exceed 500 characters'),
  body('profile.dateOfBirth').optional().isISO8601().withMessage('Please provide a valid date'),
  body('profile.gender').optional().isIn(['male', 'female', 'other', 'prefer_not_to_say']).withMessage('Invalid gender'),
  body('profile.profession').optional().isIn(['gst_practitioner', 'chartered_accountant', 'tax_consultant', 'business_owner', 'student', 'other']).withMessage('Invalid profession'),
  body('profile.experience').optional().isInt({ min: 0, max: 50 }).withMessage('Experience must be between 0 and 50 years'),
  body('profile.gstRegistrationNumber').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST registration number'),
  body('profile.panNumber').optional().matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).withMessage('Invalid PAN number'),
  body('profile.website').optional().isURL().withMessage('Please provide a valid website URL'),
  body('profile.linkedinProfile').optional().isURL().withMessage('Please provide a valid LinkedIn URL')
];

const validateEmailUpdate = [
  body('newEmail').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const validateMobileUpdate = [
  body('newMobile').isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number'),
  body('password').notEmpty().withMessage('Password is required')
];

const validatePreferencesUpdate = [
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notification preference must be boolean'),
  body('preferences.notifications.sms').optional().isBoolean().withMessage('SMS notification preference must be boolean'),
  body('preferences.notifications.push').optional().isBoolean().withMessage('Push notification preference must be boolean'),
  body('preferences.privacy.profileVisibility').optional().isIn(['public', 'members_only', 'private']).withMessage('Invalid profile visibility setting'),
  body('preferences.privacy.showEmail').optional().isBoolean().withMessage('Show email preference must be boolean'),
  body('preferences.privacy.showMobile').optional().isBoolean().withMessage('Show mobile preference must be boolean'),
  body('preferences.language').optional().isIn(['en', 'hi']).withMessage('Invalid language preference'),
  body('preferences.timezone').optional().isString().withMessage('Invalid timezone')
];

const validateAccountDeletion = [
  body('password').notEmpty().withMessage('Password is required'),
  body('confirmText').equals('DELETE MY ACCOUNT').withMessage('Please type "DELETE MY ACCOUNT" to confirm')
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

// @route   GET /api/profile
// @desc    Get user profile
// @access  Private
router.get('/', authMiddleware, getProfile);

// @route   PUT /api/profile
// @desc    Update user profile
// @access  Private
router.put('/', authMiddleware, validateProfileUpdate, handleValidationErrors, updateProfile);

// @route   POST /api/profile/avatar
// @desc    Upload profile avatar
// @access  Private
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

// @route   PUT /api/profile/email
// @desc    Update email address
// @access  Private
router.put('/email', authMiddleware, validateEmailUpdate, handleValidationErrors, updateEmail);

// @route   PUT /api/profile/mobile
// @desc    Update mobile number
// @access  Private
router.put('/mobile', authMiddleware, validateMobileUpdate, handleValidationErrors, updateMobile);

// @route   PUT /api/profile/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', authMiddleware, validatePreferencesUpdate, handleValidationErrors, updatePreferences);

// @route   DELETE /api/profile
// @desc    Delete user account
// @access  Private
router.delete('/', authMiddleware, validateAccountDeletion, handleValidationErrors, deleteAccount);

module.exports = router;
