const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  getArticles,
  getArticle,
  likeArticle,
  addComment,
  getCourses,
  getCourse,
  enrollCourse,
  updateCourseProgress,
  getWebinars,
  getWebinar,
  registerWebinar
} = require('../services/knowledgeService');
const { authMiddleware, optionalAuthMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();

// Validation middleware
const validateComment = [
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be between 1 and 1000 characters')
];

const validateCourseProgress = [
  body('moduleIndex').isInt({ min: 0 }).withMessage('Module index must be a non-negative integer'),
  body('lessonIndex').isInt({ min: 0 }).withMessage('Lesson index must be a non-negative integer'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a non-negative integer'),
  body('score').optional().isFloat({ min: 0, max: 100 }).withMessage('Score must be between 0 and 100')
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

// Article Routes
// @route   GET /api/resources/articles
// @desc    Get articles with filtering and pagination
// @access  Public
router.get('/articles', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('tags').optional().isString().withMessage('Tags must be a comma-separated string'),
  query('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty level'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative'),
  query('sort').optional().isIn(['publishedAt', 'views', 'likes', 'title']).withMessage('Invalid sort field')
], handleValidationErrors, getArticles);

// @route   GET /api/resources/articles/:slug
// @desc    Get single article by slug
// @access  Public (with optional auth for premium content)
router.get('/articles/:slug', optionalAuthMiddleware, getArticle);

// @route   POST /api/resources/articles/:slug/like
// @desc    Like an article
// @access  Private
router.post('/articles/:slug/like', authMiddleware, likeArticle);

// @route   POST /api/resources/articles/:slug/comments
// @desc    Add comment to article
// @access  Private
router.post('/articles/:slug/comments', authMiddleware, validateComment, handleValidationErrors, addComment);

// Course Routes
// @route   GET /api/resources/courses
// @desc    Get courses with filtering and pagination
// @access  Public
router.get('/courses', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid level'),
  query('pricing').optional().isIn(['free', 'paid', 'premium_only']).withMessage('Invalid pricing type'),
  query('search').optional().isString().withMessage('Search must be a string'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative'),
  query('sort').optional().isIn(['publishedAt', 'enrollmentCount', 'averageRating', 'title']).withMessage('Invalid sort field')
], handleValidationErrors, getCourses);

// @route   GET /api/resources/courses/:slug
// @desc    Get single course by slug
// @access  Public (with optional auth for enrollment info)
router.get('/courses/:slug', optionalAuthMiddleware, getCourse);

// @route   POST /api/resources/courses/:slug/enroll
// @desc    Enroll in a course
// @access  Private
router.post('/courses/:slug/enroll', authMiddleware, enrollCourse);

// @route   POST /api/resources/courses/:slug/progress
// @desc    Update course progress
// @access  Private
router.post('/courses/:slug/progress', authMiddleware, validateCourseProgress, handleValidationErrors, updateCourseProgress);

// Webinar Routes
// @route   GET /api/resources/webinars
// @desc    Get webinars with filtering and pagination
// @access  Public
router.get('/webinars', [
  query('category').optional().isString().withMessage('Category must be a string'),
  query('level').optional().isIn(['beginner', 'intermediate', 'advanced', 'all_levels']).withMessage('Invalid level'),
  query('type').optional().isIn(['upcoming', 'recorded']).withMessage('Type must be upcoming or recorded'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative')
], handleValidationErrors, getWebinars);

// @route   GET /api/resources/webinars/:slug
// @desc    Get single webinar by slug
// @access  Public (with optional auth for registration info)
router.get('/webinars/:slug', optionalAuthMiddleware, getWebinar);

// @route   POST /api/resources/webinars/:slug/register
// @desc    Register for a webinar
// @access  Private
router.post('/webinars/:slug/register', authMiddleware, registerWebinar);

module.exports = router;
