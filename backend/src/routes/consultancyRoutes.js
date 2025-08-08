const express = require('express');
const { bookConsultation, getConsultants, getConsultantSlots } = require('../services/consultancyService');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/consultancy/book
// @desc    Book a consultation
router.post('/book', authMiddleware, bookConsultation);

// @route   GET /api/consultancy
// @desc    Get all consultants
router.get('/', authMiddleware, getConsultants);

// @route   GET /api/consultancy/slots/:id
// @desc    Get available slots for a consultant by ID
router.get('/slots/:id', authMiddleware, getConsultantSlots);

module.exports = router;
