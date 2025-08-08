const Analytics = require('../models/Analytics');
const User = require('../models/User');
const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');

// Get User Dashboard Analytics
const getUserDashboard = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get or create analytics record
    let analytics = await Analytics.findOne({ user: userId });
    if (!analytics) {
      analytics = await createUserAnalytics(userId);
    }
    
    // Update analytics if data is stale (older than 24 hours)
    const isStale = new Date() - analytics.lastCalculated > 24 * 60 * 60 * 1000;
    if (isStale) {
      analytics = await updateUserAnalytics(userId);
    }
    
    // Get recent activity
    const recentActivity = await getRecentActivity(userId);
    
    // Get upcoming deadlines
    const upcomingDeadlines = await getUpcomingDeadlines(userId);
    
    // Get quick stats
    const quickStats = await getQuickStats(userId);
    
    res.json({
      success: true,
      dashboard: {
        complianceScore: {
          overall: analytics.complianceScore.overall,
          grade: analytics.complianceGrade,
          breakdown: analytics.complianceScore.breakdown,
          recommendations: analytics.complianceScore.recommendations.slice(0, 5)
        },
        gstFilingStats: analytics.gstFilingStats,
        taxLiability: analytics.taxLiability,
        itcAnalytics: analytics.itcAnalytics,
        eWayBillStats: analytics.eWayBillStats,
        platformUsage: analytics.platformUsage,
        alerts: analytics.alerts.filter(alert => !alert.isRead).slice(0, 10),
        recentActivity,
        upcomingDeadlines,
        quickStats
      }
    });
  } catch (error) {
    console.error('Get user dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data'
    });
  }
};

// Get GST Filing Status
const getGSTFilingStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year, quarter } = req.query;
    
    const currentYear = year ? parseInt(year) : new Date().getFullYear();
    const currentQuarter = quarter ? parseInt(quarter) : Math.ceil((new Date().getMonth() + 1) / 3);
    
    // Get filing status for the specified period
    const filingStatus = await calculateFilingStatus(userId, currentYear, currentQuarter);
    
    // Get historical filing performance
    const historicalPerformance = await getHistoricalFilingPerformance(userId);
    
    // Get pending returns
    const pendingReturns = await GSTReturn.find({
      user: userId,
      status: 'draft',
      dueDate: { $gte: new Date() }
    }).sort({ dueDate: 1 });
    
    // Get overdue returns
    const overdueReturns = await GSTReturn.find({
      user: userId,
      status: 'draft',
      dueDate: { $lt: new Date() }
    }).sort({ dueDate: 1 });
    
    res.json({
      success: true,
      filingStatus: {
        current: filingStatus,
        historical: historicalPerformance,
        pending: pendingReturns,
        overdue: overdueReturns,
        summary: {
          totalReturns: filingStatus.totalReturns,
          filedOnTime: filingStatus.filedOnTime,
          lateFilings: filingStatus.lateFilings,
          pendingCount: pendingReturns.length,
          overdueCount: overdueReturns.length,
          complianceRate: filingStatus.totalReturns > 0 ? 
            Math.round((filingStatus.filedOnTime / filingStatus.totalReturns) * 100) : 0
        }
      }
    });
  } catch (error) {
    console.error('Get GST filing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching GST filing status'
    });
  }
};

// Get Business Compliance Score
const getBusinessComplianceScore = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const analytics = await Analytics.findOne({ user: userId });
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Analytics data not found'
      });
    }
    
    // Calculate detailed compliance metrics
    const complianceMetrics = await calculateDetailedComplianceMetrics(userId);
    
    // Get compliance history
    const complianceHistory = analytics.complianceScore.history.slice(-12); // Last 12 records
    
    // Get industry benchmark
    const industryBenchmark = await getIndustryBenchmark(analytics.businessProfile.industryType);
    
    // Get improvement suggestions
    const improvementSuggestions = await generateImprovementSuggestions(analytics);
    
    res.json({
      success: true,
      complianceScore: {
        current: {
          overall: analytics.complianceScore.overall,
          grade: analytics.complianceGrade,
          breakdown: analytics.complianceScore.breakdown
        },
        metrics: complianceMetrics,
        history: complianceHistory,
        benchmark: industryBenchmark,
        recommendations: analytics.complianceScore.recommendations,
        improvements: improvementSuggestions,
        trends: {
          monthlyTrend: calculateComplianceTrend(complianceHistory),
          yearOverYear: calculateYearOverYearGrowth(complianceHistory)
        }
      }
    });
  } catch (error) {
    console.error('Get business compliance score error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching compliance score'
    });
  }
};

// Get Tax Liability Summary
const getTaxLiabilitySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'current' } = req.query;
    
    const analytics = await Analytics.findOne({ user: userId });
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Analytics data not found'
      });
    }
    
    // Get detailed tax liability breakdown
    const taxBreakdown = await calculateTaxLiabilityBreakdown(userId, period);
    
    // Get payment history
    const paymentHistory = await getPaymentHistory(userId);
    
    // Get projected liabilities
    const projectedLiabilities = await calculateProjectedLiabilities(userId);
    
    // Get tax saving opportunities
    const savingOpportunities = await identifyTaxSavingOpportunities(userId);
    
    res.json({
      success: true,
      taxLiability: {
        summary: analytics.taxLiability,
        breakdown: taxBreakdown,
        payments: paymentHistory,
        projections: projectedLiabilities,
        opportunities: savingOpportunities,
        trends: {
          monthlyTrend: analytics.taxLiability.monthlyTrend.slice(-12),
          yearToDateComparison: calculateYTDComparison(analytics.taxLiability)
        }
      }
    });
  } catch (error) {
    console.error('Get tax liability summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tax liability summary'
    });
  }
};

// Generate Analytics Report
const generateAnalyticsReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reportType = 'comprehensive', period = 'monthly', format = 'json' } = req.query;
    
    const analytics = await Analytics.findOne({ user: userId }).populate('user');
    if (!analytics) {
      return res.status(404).json({
        success: false,
        message: 'Analytics data not found'
      });
    }
    
    let reportData = {};
    
    switch (reportType) {
      case 'compliance':
        reportData = await generateComplianceReport(userId, period);
        break;
      case 'financial':
        reportData = await generateFinancialReport(userId, period);
        break;
      case 'filing':
        reportData = await generateFilingReport(userId, period);
        break;
      case 'comprehensive':
      default:
        reportData = await generateComprehensiveReport(userId, period);
        break;
    }
    
    if (format === 'pdf') {
      // Generate PDF report (implementation would use a PDF library)
      const pdfBuffer = await generatePDFReport(reportData, analytics.user);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="analytics-report-${Date.now()}.pdf"`);
      return res.send(pdfBuffer);
    }
    
    res.json({
      success: true,
      report: reportData,
      metadata: {
        generatedAt: new Date(),
        reportType,
        period,
        user: {
          name: analytics.user.name,
          email: analytics.user.email
        }
      }
    });
  } catch (error) {
    console.error('Generate analytics report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating analytics report'
    });
  }
};

// Update Analytics Data
const updateAnalyticsData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const updatedAnalytics = await updateUserAnalytics(userId);
    
    res.json({
      success: true,
      message: 'Analytics data updated successfully',
      lastUpdated: updatedAnalytics.lastCalculated
    });
  } catch (error) {
    console.error('Update analytics data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating analytics data'
    });
  }
};

// Utility Functions
const createUserAnalytics = async (userId) => {
  const user = await User.findById(userId);
  
  const analytics = new Analytics({
    user: userId,
    businessProfile: {
      businessType: user.profile?.businessType || 'other',
      annualTurnover: user.profile?.annualTurnover || 0,
      industryType: user.profile?.industryType || 'general'
    }
  });
  
  return await analytics.save();
};

const updateUserAnalytics = async (userId) => {
  const analytics = await Analytics.findOne({ user: userId });
  if (!analytics) return await createUserAnalytics(userId);
  
  // Update GST filing stats
  const gstReturns = await GSTReturn.find({ user: userId });
  analytics.gstFilingStats = calculateGSTFilingStats(gstReturns);
  
  // Update E-Way Bill stats
  const eWayBills = await EWayBill.find({ user: userId });
  analytics.eWayBillStats = calculateEWayBillStats(eWayBills);
  
  // Update tax liability
  analytics.taxLiability = await calculateTaxLiability(userId);
  
  // Update ITC analytics
  analytics.itcAnalytics = await calculateITCAnalytics(userId);
  
  // Update platform usage
  analytics.platformUsage = await calculatePlatformUsage(userId);
  
  // Calculate compliance score
  analytics.calculateComplianceScore();
  
  // Update recommendations
  analytics.complianceScore.recommendations = await generateComplianceRecommendations(analytics);
  
  analytics.lastCalculated = new Date();
  
  return await analytics.save();
};

const calculateGSTFilingStats = (gstReturns) => {
  const stats = {
    totalReturns: gstReturns.length,
    filedOnTime: 0,
    lateFilings: 0,
    pendingReturns: 0,
    averageFilingTime: 0,
    returnTypes: {
      gstr1: { filed: 0, pending: 0 },
      gstr3b: { filed: 0, pending: 0 },
      gstr2: { filed: 0, pending: 0 },
      gstr9: { filed: 0, pending: 0 }
    }
  };
  
  let totalFilingDays = 0;
  let filedCount = 0;
  
  gstReturns.forEach(gstReturn => {
    const returnType = gstReturn.returnType.toLowerCase();
    
    if (gstReturn.status === 'filed') {
      stats.returnTypes[returnType].filed++;
      filedCount++;
      
      const filingDays = Math.ceil((gstReturn.dueDate - gstReturn.filingDate) / (1000 * 60 * 60 * 24));
      totalFilingDays += filingDays;
      
      if (gstReturn.filingDate <= gstReturn.dueDate) {
        stats.filedOnTime++;
      } else {
        stats.lateFilings++;
      }
    } else {
      stats.pendingReturns++;
      stats.returnTypes[returnType].pending++;
    }
  });
  
  stats.averageFilingTime = filedCount > 0 ? Math.round(totalFilingDays / filedCount) : 0;
  
  return stats;
};

const calculateEWayBillStats = (eWayBills) => {
  const stats = {
    totalGenerated: eWayBills.length,
    activeEWayBills: 0,
    expiredEWayBills: 0,
    cancelledEWayBills: 0,
    averageDistance: 0,
    totalValue: 0
  };
  
  let totalDistance = 0;
  
  eWayBills.forEach(eWayBill => {
    switch (eWayBill.status) {
      case 'generated':
        if (eWayBill.validUpto > new Date()) {
          stats.activeEWayBills++;
        } else {
          stats.expiredEWayBills++;
        }
        break;
      case 'cancelled':
        stats.cancelledEWayBills++;
        break;
      case 'expired':
        stats.expiredEWayBills++;
        break;
    }
    
    totalDistance += eWayBill.transDistance || 0;
    stats.totalValue += eWayBill.totalInvoiceValue || 0;
  });
  
  stats.averageDistance = eWayBills.length > 0 ? Math.round(totalDistance / eWayBills.length) : 0;
  
  return stats;
};

const calculateTaxLiability = async (userId) => {
  // This would integrate with actual GST return data
  // For now, returning mock structure
  return {
    currentMonth: { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 },
    previousMonth: { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 },
    yearToDate: { igst: 0, cgst: 0, sgst: 0, cess: 0, total: 0 },
    monthlyTrend: [],
    projectedLiability: { nextMonth: 0, nextQuarter: 0, nextYear: 0 }
  };
};

const calculateITCAnalytics = async (userId) => {
  // This would integrate with actual ITC data
  return {
    totalITCAvailable: 0,
    itcUtilized: 0,
    itcLapsed: 0,
    itcCarryForward: 0,
    utilizationRate: 0,
    monthlyITCTrend: []
  };
};

const calculatePlatformUsage = async (userId) => {
  const user = await User.findById(userId);
  
  return {
    loginFrequency: user.loginCount || 0,
    featuresUsed: [],
    timeSpentOnPlatform: 0,
    documentsUploaded: 0,
    calculationsPerformed: 0,
    coursesCompleted: 0,
    webinarsAttended: 0
  };
};

const getRecentActivity = async (userId) => {
  // Get recent user activities
  const activities = [];
  
  // Add recent GST returns
  const recentReturns = await GSTReturn.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentReturns.forEach(gstReturn => {
    activities.push({
      type: 'gst_return',
      action: gstReturn.status === 'filed' ? 'filed' : 'created',
      description: `${gstReturn.returnType} for ${gstReturn.periodString}`,
      timestamp: gstReturn.updatedAt,
      status: gstReturn.status
    });
  });
  
  // Add recent E-Way Bills
  const recentEWayBills = await EWayBill.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);
  
  recentEWayBills.forEach(eWayBill => {
    activities.push({
      type: 'eway_bill',
      action: eWayBill.status === 'generated' ? 'generated' : 'created',
      description: `E-Way Bill ${eWayBill.ewbNo || 'Draft'}`,
      timestamp: eWayBill.updatedAt,
      status: eWayBill.status
    });
  });
  
  // Sort by timestamp and return latest 10
  return activities
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);
};

const getUpcomingDeadlines = async (userId) => {
  const deadlines = [];
  
  // Get upcoming GST return deadlines
  const upcomingReturns = await GSTReturn.find({
    user: userId,
    status: 'draft',
    dueDate: { $gte: new Date(), $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  }).sort({ dueDate: 1 });
  
  upcomingReturns.forEach(gstReturn => {
    deadlines.push({
      type: 'gst_return',
      title: `${gstReturn.returnType} Filing`,
      description: `${gstReturn.returnType} for ${gstReturn.periodString}`,
      dueDate: gstReturn.dueDate,
      priority: gstReturn.dueDate < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) ? 'high' : 'medium',
      actionUrl: `/gst/returns/${gstReturn._id}`
    });
  });
  
  return deadlines.slice(0, 10);
};

const getQuickStats = async (userId) => {
  const [gstReturnsCount, eWayBillsCount, subscriptions] = await Promise.all([
    GSTReturn.countDocuments({ user: userId }),
    EWayBill.countDocuments({ user: userId }),
    Subscription.find({ user: userId, status: 'active' })
  ]);
  
  return {
    totalGSTReturns: gstReturnsCount,
    totalEWayBills: eWayBillsCount,
    activeSubscriptions: subscriptions.length,
    membershipType: subscriptions[0]?.membership?.name || 'free'
  };
};

module.exports = {
  getUserDashboard,
  getGSTFilingStatus,
  getBusinessComplianceScore,
  getTaxLiabilitySummary,
  generateAnalyticsReport,
  updateAnalyticsData
};
