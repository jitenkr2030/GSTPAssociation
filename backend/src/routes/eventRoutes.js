const express = require('express');
const { createEvent, getEvents, deleteEvent } = require('../services/eventService');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/events
// @desc    Create a new event
router.post('/', authMiddleware, createEvent);

// @route   GET /api/events
// @desc    Get all events
router.get('/', authMiddleware, getEvents);

// @route   DELETE /api/events/:id
// @desc    Delete an event by ID
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;
