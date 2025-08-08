const express = require('express');
const { createJob, getJobs, deleteJob } = require('../services/jobService');
const { authMiddleware } = require('../middlewares/authMiddleware');

const router = express.Router();

// @route   POST /api/jobs
// @desc    Create a new job posting
router.post('/', authMiddleware, createJob);

// @route   GET /api/jobs
// @desc    Get all job postings
router.get('/', authMiddleware, getJobs);

// @route   DELETE /api/jobs/:id
// @desc    Delete a job by ID
router.delete('/:id', authMiddleware, deleteJob);

module.exports = router;
