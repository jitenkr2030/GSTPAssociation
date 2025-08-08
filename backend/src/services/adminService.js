const User = require('../models/User');
const Article = require('../models/Article');
const Course = require('../models/Course');
const Webinar = require('../models/Webinar');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const Forum = require('../models/Forum');
const { sendEmail } = require('../utils/emailUtils');

// Dashboard Analytics
const getDashboardStats = async (req, res) => {
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
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Get basic stats
    const [
      totalUsers,
      activeUsers,
      newUsers,
      totalSubscriptions,
      activeSubscriptions,
      totalRevenue,
      totalArticles,
      totalCourses,
      totalWebinars,
      totalGSTReturns,
      totalEWayBills
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({
        isActive: true,
        lastLoginAt: { $gte: startDate }
      }),
      User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Subscription.countDocuments(),
      Subscription.countDocuments({ status: 'active' }),
      calculateTotalRevenue(startDate, endDate),
      Article.countDocuments({ status: 'published' }),
      Course.countDocuments({ status: 'published' }),
      Webinar.countDocuments(),
      GSTReturn.countDocuments(),
      EWayBill.countDocuments()
    ]);

    // Get growth trends
    const userGrowth = await getUserGrowthTrend(startDate, endDate);
    const revenueGrowth = await getRevenueGrowthTrend(startDate, endDate);
    const contentGrowth = await getContentGrowthTrend(startDate, endDate);

    // Get top performing content
    const topArticles = await Article.find({ status: 'published' })
      .sort({ views: -1 })
      .limit(5)
      .select('title views likeCount commentCount');

    const topCourses = await Course.find({ status: 'published' })
      .sort({ enrollmentCount: -1 })
      .limit(5)
      .select('title enrollmentCount averageRating');

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          new: newUsers,
          growth: userGrowth
        },
        subscriptions: {
          total: totalSubscriptions,
          active: activeSubscriptions,
          conversionRate: totalUsers > 0 ? Math.round((activeSubscriptions / totalUsers) * 100) : 0
        },
        revenue: {
          total: totalRevenue,
          growth: revenueGrowth
        },
        content: {
          articles: totalArticles,
          courses: totalCourses,
          webinars: totalWebinars,
          growth: contentGrowth
        },
        compliance: {
          gstReturns: totalGSTReturns,
          eWayBills: totalEWayBills
        },
        topPerforming: {
          articles: topArticles,
          courses: topCourses
        }
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics'
    });
  }
};

// User Management
const getUsers = async (req, res) => {
  try {
    const {
      search,
      role,
      membershipType,
      status,
      limit = 20,
      skip = 0,
      sort = 'createdAt'
    } = req.query;

    let query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    if (role) query.role = role;
    if (membershipType) query['membership.type'] = membershipType;
    if (status) query.isActive = status === 'active';

    const users = await User.find(query)
      .select('-password -twoFactorAuth.secret')
      .sort({ [sort]: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users'
    });
  }
};

// Legacy functions for backward compatibility
const getAllUsers = async () => {
    return await User.find({});
};

const deleteUser = async (userId) => {
    await User.findByIdAndDelete(userId);
    return { message: 'User deleted successfully' };
};

const moderateForumPost = async (postId, action) => {
    // Logic to moderate a forum post (e.g., approve, delete, etc.)
    const post = await Forum.findById(postId);
    if (!post) {
        throw new Error('Post not found');
    }

    if (action === 'approve') {
        post.isApproved = true;
    } else if (action === 'delete') {
        await post.remove();
        return { message: 'Post deleted successfully' };
    }

    await post.save();
    return post;
};

const updateSettings = async (settingsData) => {
    // Logic to update system settings
    // This is typically stored in a configuration collection
    const settings = await Settings.findOneAndUpdate({}, settingsData, { new: true });
    return settings;
};

// Utility functions
const calculateTotalRevenue = async (startDate, endDate) => {
  const result = await Invoice.aggregate([
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
  ]);

  return result[0]?.total || 0;
};

const getUserGrowthTrend = async (startDate, endDate) => {
  const result = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        count: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  return result;
};

const getRevenueGrowthTrend = async (startDate, endDate) => {
  const result = await Invoice.aggregate([
    {
      $match: {
        status: 'paid',
        paidDate: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$paidDate' },
          month: { $month: '$paidDate' },
          day: { $dayOfMonth: '$paidDate' }
        },
        revenue: { $sum: '$total' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
    }
  ]);

  return result;
};

const getContentGrowthTrend = async (startDate, endDate) => {
  const [articles, courses, webinars] = await Promise.all([
    Article.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]),
    Course.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'published'
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      }
    ]),
    Webinar.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      }
    ])
  ]);

  return { articles, courses, webinars };
};

module.exports = {
  getDashboardStats,
  getUsers,
  getAllUsers,
  deleteUser,
  moderateForumPost,
  updateSettings
};
