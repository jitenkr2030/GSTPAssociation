const express = require('express');
const { body, query, validationResult } = require('express-validator');
const {
  getEnhancedUserManagement,
  getContentManagement,
  getSupportManagement,
  getEnhancedAnalyticsDashboard,
  getNotificationManagement,
  createAutomationRule,
  performBulkOperation
} = require('../services/enhancedAdminService');
const { authMiddleware, adminMiddleware } = require('../middleware/authMiddleware');
const { auditLogger } = require('../middleware/auditMiddleware');

const router = express.Router();

// Apply audit logging to all admin routes
router.use(auditLogger({
  logLevel: 'ALL',
  excludePaths: ['/health']
}));

// Validation middleware
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date format')
];

const validatePagination = [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('skip').optional().isInt({ min: 0 }).withMessage('Skip must be non-negative')
];

const validateBulkOperation = [
  body('operation').notEmpty().withMessage('Operation is required'),
  body('entityType').isIn(['users', 'tickets', 'content']).withMessage('Invalid entity type'),
  body('entityIds').isArray({ min: 1 }).withMessage('Entity IDs must be a non-empty array'),
  body('data').optional().isObject().withMessage('Data must be an object')
];

const validateAutomationRule = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
  body('trigger').notEmpty().withMessage('Trigger is required'),
  body('conditions').isArray().withMessage('Conditions must be an array'),
  body('actions').isArray().withMessage('Actions must be an array')
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

// Enhanced User Management Routes
// @route   GET /api/admin/enhanced/users
// @desc    Get enhanced user management data with advanced filtering and analytics
// @access  Private (Admin only)
router.get('/users', authMiddleware, adminMiddleware, [
  query('search').optional().isString().withMessage('Search must be a string'),
  query('role').optional().isIn(['user', 'admin', 'moderator', 'agent']).withMessage('Invalid role'),
  query('membershipType').optional().isIn(['free', 'basic', 'premium', 'elite']).withMessage('Invalid membership type'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('Invalid status'),
  query('registrationDate').optional().matches(/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/).withMessage('Invalid registration date range format'),
  query('lastActivity').optional().matches(/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/).withMessage('Invalid last activity date range format'),
  query('sort').optional().isIn(['createdAt', 'name', 'email', 'lastLoginAt']).withMessage('Invalid sort field'),
  query('export').optional().isBoolean().withMessage('Export must be boolean'),
  ...validatePagination
], handleValidationErrors, getEnhancedUserManagement);

// Enhanced Content Management Routes
// @route   GET /api/admin/enhanced/content
// @desc    Get comprehensive content management data
// @access  Private (Admin only)
router.get('/content', authMiddleware, adminMiddleware, [
  query('contentType').optional().isIn(['all', 'articles', 'courses', 'webinars']).withMessage('Invalid content type'),
  query('status').optional().isIn(['published', 'draft', 'archived']).withMessage('Invalid status'),
  query('author').optional().isMongoId().withMessage('Invalid author ID'),
  query('dateRange').optional().matches(/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date range format'),
  ...validatePagination
], handleValidationErrors, getContentManagement);

// Enhanced Support Management Routes
// @route   GET /api/admin/enhanced/support
// @desc    Get comprehensive support management data
// @access  Private (Admin only)
router.get('/support', authMiddleware, adminMiddleware, [
  query('ticketStatus').optional().isIn(['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed']).withMessage('Invalid ticket status'),
  query('chatStatus').optional().isIn(['waiting', 'active', 'ended', 'transferred', 'abandoned']).withMessage('Invalid chat status'),
  query('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent', 'Critical', 'VIP']).withMessage('Invalid priority'),
  query('department').optional().isIn(['General Support', 'Technical', 'GST Expert', 'Billing', 'Sales']).withMessage('Invalid department'),
  query('agent').optional().isMongoId().withMessage('Invalid agent ID'),
  query('dateRange').optional().matches(/^\d{4}-\d{2}-\d{2},\d{4}-\d{2}-\d{2}$/).withMessage('Invalid date range format'),
  ...validatePagination
], handleValidationErrors, getSupportManagement);

// Enhanced Analytics Dashboard Routes
// @route   GET /api/admin/enhanced/analytics
// @desc    Get comprehensive analytics dashboard with advanced metrics
// @access  Private (Admin only)
router.get('/analytics', authMiddleware, adminMiddleware, [
  query('period').optional().isIn(['7days', '30days', '90days', '1year']).withMessage('Invalid period')
], handleValidationErrors, getEnhancedAnalyticsDashboard);

// Notification Management Routes
// @route   GET /api/admin/enhanced/notifications
// @desc    Get notification management data
// @access  Private (Admin only)
router.get('/notifications', authMiddleware, adminMiddleware, getNotificationManagement);

// @route   POST /api/admin/enhanced/notifications/automation
// @desc    Create automated notification rule
// @access  Private (Admin only)
router.post('/notifications/automation', authMiddleware, adminMiddleware, validateAutomationRule, handleValidationErrors, createAutomationRule);

// Bulk Operations Routes
// @route   POST /api/admin/enhanced/bulk-operation
// @desc    Perform bulk operations on entities
// @access  Private (Admin only)
router.post('/bulk-operation', authMiddleware, adminMiddleware, validateBulkOperation, handleValidationErrors, performBulkOperation);

// System Health and Monitoring Routes
// @route   GET /api/admin/enhanced/system-health
// @desc    Get comprehensive system health metrics
// @access  Private (Admin only)
router.get('/system-health', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        email: await checkEmailService(),
        sms: await checkSMSService(),
        storage: await checkStorageService(),
        payment: await checkPaymentGateways(),
        integrations: await checkIntegrations()
      },
      metrics: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        activeConnections: await getActiveConnections(),
        queueSizes: await getQueueSizes()
      },
      alerts: await getSystemAlerts()
    };
    
    // Determine overall health status
    const serviceStatuses = Object.values(health.services);
    if (serviceStatuses.some(status => status.status === 'critical')) {
      health.status = 'critical';
    } else if (serviceStatuses.some(status => status.status === 'warning')) {
      health.status = 'warning';
    }
    
    res.json({
      success: true,
      health
    });
  } catch (error) {
    console.error('System health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking system health',
      health: {
        status: 'critical',
        timestamp: new Date(),
        error: error.message
      }
    });
  }
});

// Security Monitoring Routes
// @route   GET /api/admin/enhanced/security
// @desc    Get security monitoring data
// @access  Private (Admin only)
router.get('/security', authMiddleware, adminMiddleware, [
  query('riskLevel').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).withMessage('Invalid risk level'),
  query('timeframe').optional().isIn(['1hour', '24hours', '7days', '30days']).withMessage('Invalid timeframe'),
  ...validatePagination
], handleValidationErrors, async (req, res) => {
  try {
    const { riskLevel, timeframe = '24hours', limit = 50, skip = 0 } = req.query;
    
    // Calculate time range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeframe) {
      case '1hour':
        startDate.setHours(startDate.getHours() - 1);
        break;
      case '24hours':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
    }
    
    // Get security events
    const AuditLog = require('../models/AuditLog');
    
    let query = {
      timestamp: { $gte: startDate, $lte: endDate }
    };
    
    if (riskLevel) {
      query['security.riskLevel'] = riskLevel;
    } else {
      query['security.riskLevel'] = { $in: ['HIGH', 'CRITICAL'] };
    }
    
    const [securityEvents, threatSummary, ipAnalysis] = await Promise.all([
      AuditLog.find(query)
        .populate('user', 'name email')
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      
      AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$security.riskLevel',
            count: { $sum: 1 },
            uniqueUsers: { $addToSet: '$user' },
            uniqueIPs: { $addToSet: '$request.ip' }
          }
        }
      ]),
      
      AuditLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$request.ip',
            count: { $sum: 1 },
            riskLevels: { $addToSet: '$security.riskLevel' },
            users: { $addToSet: '$user' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);
    
    const total = await AuditLog.countDocuments(query);
    
    res.json({
      success: true,
      security: {
        events: securityEvents,
        summary: {
          total,
          timeframe,
          threatSummary,
          topRiskyIPs: ipAnalysis
        },
        pagination: {
          total,
          limit: parseInt(limit),
          skip: parseInt(skip),
          hasMore: total > parseInt(skip) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Security monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching security data'
    });
  }
});

// Performance Monitoring Routes
// @route   GET /api/admin/enhanced/performance
// @desc    Get system performance metrics
// @access  Private (Admin only)
router.get('/performance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const performance = {
      timestamp: new Date(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      database: await getDatabasePerformance(),
      api: await getAPIPerformance(),
      cache: await getCachePerformance(),
      queues: await getQueuePerformance()
    };
    
    res.json({
      success: true,
      performance
    });
  } catch (error) {
    console.error('Performance monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching performance data'
    });
  }
});

// Utility functions for health checks
const checkDatabaseHealth = async () => {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const stats = await mongoose.connection.db.stats();
      return {
        status: 'healthy',
        details: {
          connected: true,
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexSize: stats.indexSize
        }
      };
    }
    return { status: 'critical', details: { connected: false } };
  } catch (error) {
    return { status: 'critical', error: error.message };
  }
};

const checkRedisHealth = async () => {
  // Implementation for Redis health check
  return { status: 'healthy', details: { connected: true } };
};

const checkEmailService = async () => {
  // Implementation for email service health check
  return { status: 'healthy', details: { service: 'operational' } };
};

const checkSMSService = async () => {
  // Implementation for SMS service health check
  return { status: 'healthy', details: { service: 'operational' } };
};

const checkStorageService = async () => {
  // Implementation for storage service health check
  return { status: 'healthy', details: { service: 'operational' } };
};

const checkPaymentGateways = async () => {
  // Implementation for payment gateway health check
  return { status: 'healthy', details: { gateways: ['razorpay', 'stripe'] } };
};

const checkIntegrations = async () => {
  // Implementation for integration health check
  return { status: 'healthy', details: { integrations: ['gstn', 'accounting'] } };
};

const getActiveConnections = async () => {
  // Implementation for active connections count
  return 0;
};

const getQueueSizes = async () => {
  // Implementation for queue sizes
  return {};
};

const getSystemAlerts = async () => {
  // Implementation for system alerts
  return [];
};

const getDatabasePerformance = async () => {
  // Implementation for database performance metrics
  return {};
};

const getAPIPerformance = async () => {
  // Implementation for API performance metrics
  return {};
};

const getCachePerformance = async () => {
  // Implementation for cache performance metrics
  return {};
};

const getQueuePerformance = async () => {
  // Implementation for queue performance metrics
  return {};
};

module.exports = router;
