// routes/userRoutes.js

const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  deleteUserAccount,
  changePassword,
} = require('../services/userService');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get user profile (protected)
router.get('/profile', authMiddleware, getUserProfile);

// @route   PUT /api/users/profile
// @desc    Update user profile (protected)
router.put('/profile', authMiddleware, updateUserProfile);

// @route   DELETE /api/users/profile
// @desc    Delete user account (protected)
router.delete('/profile', authMiddleware, deleteUserAccount);

// @route   POST /api/users/change-password
// @desc    Change user password (protected)
router.post('/change-password', authMiddleware, changePassword);

module.exports = router;
