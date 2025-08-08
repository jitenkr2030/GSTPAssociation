const User = require('../models/User');
const Article = require('../models/Article');
const Course = require('../models/Course');
const Webinar = require('../models/Webinar');
const SupportTicket = require('../models/SupportTicket');
const LiveChat = require('../models/LiveChat');
const Analytics = require('../models/Analytics');
const AuditLog = require('../models/AuditLog');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// Enhanced User Management
const getEnhancedUserManagement = async (req, res) => {
  try {
    const { 
      search, 
      role, 
      membershipType, 
      status, 
      registrationDate,
      lastActivity,
      limit = 20, 
      skip = 0, 
      sort = 'createdAt',
      export: exportData = false
    } = req.query;
    
    let query = {};
    
    // Build query filters
    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { 'profile.phone': new RegExp(search, 'i') }
      ];
    }
    
    if (role) query.role = role;
    if (membershipType) query['membership.type'] = membershipType;
    if (status) query.isActive = status === 'active';
    
    // Date filters
    if (registrationDate) {
      const [startDate, endDate] = registrationDate.split(',');
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (lastActivity) {
      const [startDate, endDate] = lastActivity.split(',');
      query.lastLoginAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    // Get users with enhanced data
    const users = await User.find(query)
      .select('-password -twoFactorAuth.secret')
      .populate('subscription', 'status plan amount')
      .sort({ [sort]: -1 })
      .limit(exportData ? 0 : parseInt(limit))
      .skip(exportData ? 0 : parseInt(skip));
    
    // Get additional metrics for each user
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const [ticketCount, chatCount, analytics] = await Promise.all([
        SupportTicket.countDocuments({ user: user._id }),
        LiveChat.countDocuments({ customer: user._id }),
        Analytics.findOne({ user: user._id })
      ]);
      
      return {
        ...user.toObject(),
        metrics: {
          supportTickets: ticketCount,
          liveChats: chatCount,
          complianceScore: analytics?.complianceScore?.overall || 0,
          lastActivity: user.lastLoginAt,
          accountAge: Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24))
        }
      };
    }));
    
    const total = await User.countDocuments(query);
    
    if (exportData) {
      // Return CSV data for export
      const csvData = enhancedUsers.map(user => ({
        name: user.name,
        email: user.email,
        role: user.role,
        membershipType: user.membership?.type || 'free',
        status: user.isActive ? 'Active' : 'Inactive',
        registrationDate: user.createdAt.toISOString().split('T')[0],
        lastActivity: user.lastLoginAt?.toISOString().split('T')[0] || 'Never',
        supportTickets: user.metrics.supportTickets,
        complianceScore: user.metrics.complianceScore
      }));
      
      return res.json({
        success: true,
        data: csvData,
        format: 'csv'
      });
    }
    
    res.json({
      success: true,
      users: enhancedUsers,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      },
      summary: {
        totalUsers: total,
        activeUsers: await User.countDocuments({ ...query, isActive: true }),
        premiumUsers: await User.countDocuments({ ...query, 'membership.type': { $in: ['premium', 'elite'] } }),
        newUsersThisMonth: await User.countDocuments({
          ...query,
          createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
        })
      }
    });
  } catch (error) {
    console.error('Enhanced user management error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user management data'
    });
  }
};

// Enhanced Content Management
const getContentManagement = async (req, res) => {
  try {
    const { contentType = 'all', status, author, dateRange, limit = 20, skip = 0 } = req.query;
    
    let contentData = {};
    
    if (contentType === 'all' || contentType === 'articles') {
      const articleQuery = {};
      if (status) articleQuery.status = status;
      if (author) articleQuery.author = author;
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        articleQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      
      const articles = await Article.find(articleQuery)
        .populate('author', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      contentData.articles = {
        items: articles,
        total: await Article.countDocuments(articleQuery),
        stats: {
          published: await Article.countDocuments({ ...articleQuery, status: 'published' }),
          draft: await Article.countDocuments({ ...articleQuery, status: 'draft' }),
          totalViews: await Article.aggregate([
            { $match: articleQuery },
            { $group: { _id: null, totalViews: { $sum: '$views' } } }
          ]).then(result => result[0]?.totalViews || 0)
        }
      };
    }
    
    if (contentType === 'all' || contentType === 'courses') {
      const courseQuery = {};
      if (status) courseQuery.status = status;
      if (author) courseQuery.instructor = author;
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        courseQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      
      const courses = await Course.find(courseQuery)
        .populate('instructor', 'name email')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      contentData.courses = {
        items: courses,
        total: await Course.countDocuments(courseQuery),
        stats: {
          published: await Course.countDocuments({ ...courseQuery, status: 'published' }),
          draft: await Course.countDocuments({ ...courseQuery, status: 'draft' }),
          totalEnrollments: await Course.aggregate([
            { $match: courseQuery },
            { $group: { _id: null, totalEnrollments: { $sum: '$enrollmentCount' } } }
          ]).then(result => result[0]?.totalEnrollments || 0)
        }
      };
    }
    
    if (contentType === 'all' || contentType === 'webinars') {
      const webinarQuery = {};
      if (status) webinarQuery.status = status;
      if (author) webinarQuery.host = author;
      if (dateRange) {
        const [startDate, endDate] = dateRange.split(',');
        webinarQuery.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      
      const webinars = await Webinar.find(webinarQuery)
        .populate('host', 'name email')
        .sort({ scheduledAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));
      
      contentData.webinars = {
        items: webinars,
        total: await Webinar.countDocuments(webinarQuery),
        stats: {
          upcoming: await Webinar.countDocuments({ 
            ...webinarQuery, 
            status: 'scheduled',
            scheduledAt: { $gt: new Date() }
          }),
          completed: await Webinar.countDocuments({ ...webinarQuery, status: 'completed' }),
          totalRegistrations: await Webinar.aggregate([
            { $match: webinarQuery },
            { $group: { _id: null, totalRegistrations: { $sum: '$registrationCount' } } }
          ]).then(result => result[0]?.totalRegistrations || 0)
        }
      };
    }
    
    res.json({
      success: true,
      content: contentData
    });
  } catch (error) {
    console.error('Content management error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching content management data'
    });
  }
};

// Enhanced Support Management
const getSupportManagement = async (req, res) => {
  try {
    const { 
      ticketStatus, 
      chatStatus, 
      priority, 
      department, 
      agent,
      dateRange,
      limit = 20, 
      skip = 0 
    } = req.query;
    
    // Build queries
    let ticketQuery = { isDeleted: false };
    let chatQuery = {};
    
    if (ticketStatus) ticketQuery.status = ticketStatus;
    if (chatStatus) chatQuery.status = chatStatus;
    if (priority) {
      ticketQuery.priority = priority;
      chatQuery.priority = priority;
    }
    if (department) {
      ticketQuery.department = department;
      chatQuery.department = department;
    }
    if (agent) {
      ticketQuery.assignedTo = agent;
      chatQuery.agent = agent;
    }
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(',');
      const dateFilter = { $gte: new Date(startDate), $lte: new Date(endDate) };
      ticketQuery.createdAt = dateFilter;
      chatQuery.startedAt = dateFilter;
    }
    
    // Get tickets and chats
    const [tickets, chats, ticketStats, chatStats] = await Promise.all([
      SupportTicket.find(ticketQuery)
        .populate('user', 'name email')
        .populate('assignedTo', 'name')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      
      LiveChat.find(chatQuery)
        .populate('customer', 'name email')
        .populate('agent', 'name')
        .sort({ startedAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip)),
      
      SupportTicket.getTicketStats(ticketQuery),
      LiveChat.aggregate([
        { $match: chatQuery },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            waiting: { $sum: { $cond: [{ $eq: ['$status', 'waiting'] }, 1, 0] } },
            ended: { $sum: { $cond: [{ $eq: ['$status', 'ended'] }, 1, 0] } },
            avgSessionDuration: { $avg: '$metrics.sessionDuration' },
            avgRating: { $avg: '$feedback.rating' }
          }
        }
      ])
    ]);
    
    // Get agent performance
    const agentPerformance = await getAgentPerformanceData(dateRange);
    
    res.json({
      success: true,
      support: {
        tickets: {
          items: tickets,
          stats: ticketStats[0] || {},
          total: await SupportTicket.countDocuments(ticketQuery)
        },
        chats: {
          items: chats,
          stats: chatStats[0] || {},
          total: await LiveChat.countDocuments(chatQuery)
        },
        agentPerformance
      }
    });
  } catch (error) {
    console.error('Support management error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching support management data'
    });
  }
};

// Enhanced Analytics Dashboard
const getEnhancedAnalyticsDashboard = async (req, res) => {
  try {
    const { period = '30days' } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7days':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30days':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90days':
        startDate.setDate(startDate.getDate() - 90);
        break;
      case '1year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }
    
    // Get comprehensive analytics
    const [
      userMetrics,
      contentMetrics,
      supportMetrics,
      financialMetrics,
      complianceMetrics,
      systemMetrics
    ] = await Promise.all([
      getUserMetrics(startDate, endDate),
      getContentMetrics(startDate, endDate),
      getSupportMetrics(startDate, endDate),
      getFinancialMetrics(startDate, endDate),
      getComplianceMetrics(startDate, endDate),
      getSystemMetrics(startDate, endDate)
    ]);
    
    res.json({
      success: true,
      analytics: {
        period,
        dateRange: { startDate, endDate },
        metrics: {
          users: userMetrics,
          content: contentMetrics,
          support: supportMetrics,
          financial: financialMetrics,
          compliance: complianceMetrics,
          system: systemMetrics
        }
      }
    });
  } catch (error) {
    console.error('Enhanced analytics dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics dashboard'
    });
  }
};

// Automated Notifications Management
const getNotificationManagement = async (req, res) => {
  try {
    const notifications = await getSystemNotifications();
    const automationRules = await getAutomationRules();
    const notificationStats = await getNotificationStats();
    
    res.json({
      success: true,
      notifications: {
        active: notifications,
        rules: automationRules,
        stats: notificationStats
      }
    });
  } catch (error) {
    console.error('Notification management error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notification management data'
    });
  }
};

const createAutomationRule = async (req, res) => {
  try {
    const { 
      name, 
      description, 
      trigger, 
      conditions, 
      actions, 
      isActive = true 
    } = req.body;
    
    // Create automation rule (this would be stored in a dedicated collection)
    const rule = {
      name,
      description,
      trigger,
      conditions,
      actions,
      isActive,
      createdBy: req.user.id,
      createdAt: new Date()
    };
    
    // Save rule and set up automation
    // Implementation would depend on the automation system
    
    res.json({
      success: true,
      message: 'Automation rule created successfully',
      rule
    });
  } catch (error) {
    console.error('Create automation rule error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating automation rule'
    });
  }
};

// Bulk Operations
const performBulkOperation = async (req, res) => {
  try {
    const { operation, entityType, entityIds, data } = req.body;
    
    let result = {};
    
    switch (entityType) {
      case 'users':
        result = await performBulkUserOperation(operation, entityIds, data);
        break;
      case 'tickets':
        result = await performBulkTicketOperation(operation, entityIds, data);
        break;
      case 'content':
        result = await performBulkContentOperation(operation, entityIds, data);
        break;
      default:
        throw new Error('Unsupported entity type');
    }
    
    // Log bulk operation
    await AuditLog.create({
      user: req.user.id,
      userEmail: req.user.email,
      userName: req.user.name,
      userRole: req.user.role,
      action: 'BULK_ACTION',
      resource: { type: entityType },
      request: {
        method: req.method,
        url: req.originalUrl,
        ip: req.ip,
        body: { operation, entityType, entityCount: entityIds.length }
      },
      response: {
        statusCode: 200,
        success: true,
        message: `Bulk ${operation} completed`
      },
      business: {
        module: 'Admin',
        feature: 'Bulk Operations'
      },
      metadata: {
        tags: ['BULK_OPERATION', 'ADMIN'],
        priority: 'HIGH'
      }
    });
    
    res.json({
      success: true,
      message: `Bulk ${operation} completed successfully`,
      result
    });
  } catch (error) {
    console.error('Bulk operation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing bulk operation'
    });
  }
};

// Utility Functions
const getUserMetrics = async (startDate, endDate) => {
  const [totalUsers, newUsers, activeUsers, premiumUsers] = await Promise.all([
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
    User.countDocuments({ 
      isActive: true, 
      lastLoginAt: { $gte: startDate } 
    }),
    User.countDocuments({ 
      'membership.type': { $in: ['premium', 'elite'] },
      'membership.status': 'active'
    })
  ]);
  
  return { totalUsers, newUsers, activeUsers, premiumUsers };
};

const getContentMetrics = async (startDate, endDate) => {
  const [articles, courses, webinars] = await Promise.all([
    Article.countDocuments({ 
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate }
    }),
    Course.countDocuments({ 
      status: 'published',
      publishedAt: { $gte: startDate, $lte: endDate }
    }),
    Webinar.countDocuments({ 
      createdAt: { $gte: startDate, $lte: endDate }
    })
  ]);
  
  return { articles, courses, webinars };
};

const getSupportMetrics = async (startDate, endDate) => {
  const [tickets, chats, avgResolutionTime, satisfaction] = await Promise.all([
    SupportTicket.countDocuments({ 
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    LiveChat.countDocuments({ 
      startedAt: { $gte: startDate, $lte: endDate }
    }),
    SupportTicket.aggregate([
      { 
        $match: { 
          'resolution.resolvedAt': { $gte: startDate, $lte: endDate }
        }
      },
      { 
        $group: { 
          _id: null, 
          avgTime: { $avg: '$resolution.resolutionTime' }
        }
      }
    ]).then(result => result[0]?.avgTime || 0),
    SupportTicket.aggregate([
      { 
        $match: { 
          'feedback.submittedAt': { $gte: startDate, $lte: endDate }
        }
      },
      { 
        $group: { 
          _id: null, 
          avgRating: { $avg: '$feedback.rating' }
        }
      }
    ]).then(result => result[0]?.avgRating || 0)
  ]);
  
  return { tickets, chats, avgResolutionTime, satisfaction };
};

const getFinancialMetrics = async (startDate, endDate) => {
  const [revenue, subscriptions, refunds] = await Promise.all([
    Invoice.aggregate([
      { 
        $match: { 
          status: 'paid',
          paidDate: { $gte: startDate, $lte: endDate }
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$total' }
        }
      }
    ]).then(result => result[0]?.total || 0),
    Subscription.countDocuments({ 
      status: 'active',
      createdAt: { $gte: startDate, $lte: endDate }
    }),
    Invoice.aggregate([
      { 
        $match: { 
          status: 'refunded',
          updatedAt: { $gte: startDate, $lte: endDate }
        }
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: '$total' }
        }
      }
    ]).then(result => result[0]?.total || 0)
  ]);
  
  return { revenue, subscriptions, refunds };
};

const getComplianceMetrics = async (startDate, endDate) => {
  const avgComplianceScore = await Analytics.aggregate([
    { $group: { _id: null, avgScore: { $avg: '$complianceScore.overall' } } }
  ]).then(result => result[0]?.avgScore || 0);
  
  return { avgComplianceScore };
};

const getSystemMetrics = async (startDate, endDate) => {
  const [auditLogs, securityEvents] = await Promise.all([
    AuditLog.countDocuments({ 
      timestamp: { $gte: startDate, $lte: endDate }
    }),
    AuditLog.countDocuments({ 
      timestamp: { $gte: startDate, $lte: endDate },
      'security.riskLevel': { $in: ['HIGH', 'CRITICAL'] }
    })
  ]);
  
  return { auditLogs, securityEvents };
};

const getAgentPerformanceData = async (dateRange) => {
  // Implementation for agent performance metrics
  return [];
};

const getSystemNotifications = async () => {
  // Implementation for system notifications
  return [];
};

const getAutomationRules = async () => {
  // Implementation for automation rules
  return [];
};

const getNotificationStats = async () => {
  // Implementation for notification statistics
  return {};
};

const performBulkUserOperation = async (operation, userIds, data) => {
  switch (operation) {
    case 'activate':
      return User.updateMany({ _id: { $in: userIds } }, { isActive: true });
    case 'deactivate':
      return User.updateMany({ _id: { $in: userIds } }, { isActive: false });
    case 'updateRole':
      return User.updateMany({ _id: { $in: userIds } }, { role: data.role });
    default:
      throw new Error('Unsupported user operation');
  }
};

const performBulkTicketOperation = async (operation, ticketIds, data) => {
  switch (operation) {
    case 'assign':
      return SupportTicket.updateMany({ _id: { $in: ticketIds } }, { 
        assignedTo: data.agentId,
        status: 'In Progress'
      });
    case 'close':
      return SupportTicket.updateMany({ _id: { $in: ticketIds } }, { 
        status: 'Closed',
        closedAt: new Date()
      });
    default:
      throw new Error('Unsupported ticket operation');
  }
};

const performBulkContentOperation = async (operation, contentIds, data) => {
  switch (operation) {
    case 'publish':
      return Article.updateMany({ _id: { $in: contentIds } }, { 
        status: 'published',
        publishedAt: new Date()
      });
    case 'unpublish':
      return Article.updateMany({ _id: { $in: contentIds } }, { 
        status: 'draft'
      });
    default:
      throw new Error('Unsupported content operation');
  }
};

module.exports = {
  getEnhancedUserManagement,
  getContentManagement,
  getSupportManagement,
  getEnhancedAnalyticsDashboard,
  getNotificationManagement,
  createAutomationRule,
  performBulkOperation
};
