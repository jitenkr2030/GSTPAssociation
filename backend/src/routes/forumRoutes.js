const express = require('express');
const { createForum, getForums, deleteForum } = require('../services/forumService');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/forums
// @desc    Create a new forum
router.post('/', authMiddleware, createForum);

// @route   GET /api/forums
// @desc    Get all forums
router.get('/', authMiddleware, getForums);

// @route   DELETE /api/forums/:id
// @desc    Delete a forum by ID
router.delete('/:id', authMiddleware, deleteForum);

module.exports = router;
