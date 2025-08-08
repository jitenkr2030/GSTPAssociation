const express = require('express');
const { body, validationResult } = require('express-validator');
const {
  register,
  login,
  sendMobileOTP,
  verifyMobileOTP,
  verifyEmail,
  resendVerificationEmail,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  googleLogin
} = require('../services/authService');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('mobile').optional().isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number'),
  body('role').optional().isIn(['user', 'gst_practitioner', 'consultant', 'accountant', 'business_owner']).withMessage('Invalid role')
];

const validateLogin = [
  body('email').optional().isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('mobile').optional().isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('otp').optional().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
];

const validatePasswordReset = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
];

const validatePasswordChange = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
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

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validateRegistration, handleValidationErrors, register);

// @route   POST /api/auth/login
// @desc    Login a user and return a JWT
// @access  Public
router.post('/login', validateLogin, handleValidationErrors, login);

// @route   POST /api/auth/send-mobile-otp
// @desc    Send OTP to mobile number
// @access  Public
router.post('/send-mobile-otp', [
  body('mobile').isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number')
], handleValidationErrors, sendMobileOTP);

// @route   POST /api/auth/verify-mobile-otp
// @desc    Verify mobile OTP
// @access  Public
router.post('/verify-mobile-otp', [
  body('mobile').isMobilePhone('en-IN').withMessage('Please provide a valid Indian mobile number'),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits')
], handleValidationErrors, verifyMobileOTP);

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email using the verification token
// @access  Public
router.get('/verify-email/:token', verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email to the user
// @access  Public
router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], handleValidationErrors, resendVerificationEmail);

// @route   POST /api/auth/setup-2fa
// @desc    Setup two-factor authentication
// @access  Private
router.post('/setup-2fa', authMiddleware, setupTwoFactor);

// @route   POST /api/auth/verify-2fa
// @desc    Verify and enable two-factor authentication
// @access  Private
router.post('/verify-2fa', authMiddleware, [
  body('token').isLength({ min: 6, max: 6 }).withMessage('2FA token must be 6 digits')
], handleValidationErrors, verifyTwoFactor);

// @route   POST /api/auth/disable-2fa
// @desc    Disable two-factor authentication
// @access  Private
router.post('/disable-2fa', authMiddleware, [
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, disableTwoFactor);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email')
], handleValidationErrors, forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password using token
// @access  Public
router.post('/reset-password', validatePasswordReset, handleValidationErrors, resetPassword);

// @route   POST /api/auth/change-password
// @desc    Change password for logged-in user
// @access  Private
router.post('/change-password', authMiddleware, validatePasswordChange, handleValidationErrors, changePassword);

// @route   POST /api/auth/logout
// @desc    Logout the user
// @access  Private
router.post('/logout', authMiddleware, logout);

// @route   POST /api/auth/google
// @desc    Google OAuth login
// @access  Public
router.post('/google', [
  body('googleId').notEmpty().withMessage('Google ID is required'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('name').notEmpty().withMessage('Name is required')
], handleValidationErrors, googleLogin);

module.exports = router;

