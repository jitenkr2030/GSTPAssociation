const { body, param, query } = require('express-validator');

// Validation for user inputs
const validateUser = [
    body('username').isString().isLength({ min: 3, max: 20 }).trim().withMessage('Username must be between 3 and 20 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email format'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
];

// Validation for resource IDs or other identifiers
const validateId = [
    param('id').isMongoId().withMessage('Invalid ID format'),
];

// Validation for query parameters
const validatePagination = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be a positive integer'),
];

module.exports = {
    validateUser,
    validateId,
    validatePagination,
};
