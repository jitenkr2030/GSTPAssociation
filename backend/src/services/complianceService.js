const cron = require('node-cron');
const User = require('../models/User');
const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// Automated Compliance Reminders
const complianceReminderJob = cron.schedule('0 9 * * *', async () => {
  console.log('Running compliance reminder job...');
  
  try {
    await sendReturnDueReminders();
    await sendEWayBillExpiryReminders();
    await sendComplianceScoreUpdates();
  } catch (error) {
    console.error('Compliance reminder job error:', error);
  }
}, {
  scheduled: false
});

// Send return due reminders
const sendReturnDueReminders = async () => {
  try {
    const today = new Date();
    const reminderDays = [7, 3, 1]; // Send reminders 7, 3, and 1 days before due date
    
    for (const days of reminderDays) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      
      // Find users with returns due on target date
      const usersWithDueReturns = await findUsersWithDueReturns(targetDate);
      
      for (const user of usersWithDueReturns) {
        await sendReturnDueReminderEmail(user, days);
        
        if (user.mobile && user.preferences?.notifications?.sms) {
          await sendReturnDueReminderSMS(user.mobile, days);
        }
      }
    }
  } catch (error) {
    console.error('Send return due reminders error:', error);
  }
};

// Send E-Way Bill expiry reminders
const sendEWayBillExpiryReminders = async () => {
  try {
    const expiringEWayBills = await EWayBill.findExpiringEWayBills(1);
    
    for (const eWayBill of expiringEWayBills) {
      await sendEWayBillExpiryEmail(eWayBill.user, eWayBill);
      
      if (eWayBill.user.mobile && eWayBill.user.preferences?.notifications?.sms) {
        await sendEWayBillExpirySMS(eWayBill.user.mobile, eWayBill.ewbNo);
      }
    }
  } catch (error) {
    console.error('Send E-Way Bill expiry reminders error:', error);
  }
};

// Send compliance score updates
const sendComplianceScoreUpdates = async () => {
  try {
    // Send weekly compliance score updates on Mondays
    const today = new Date();
    if (today.getDay() !== 1) return; // Only on Mondays
    
    const users = await User.find({ 
      isActive: true,
      'preferences.notifications.email': true 
    });
    
    for (const user of users) {
      const complianceData = await calculateUserComplianceScore(user._id);
      
      if (complianceData.score < 80) {
        await sendComplianceScoreEmail(user, complianceData);
      }
    }
  } catch (error) {
    console.error('Send compliance score updates error:', error);
  }
};

// Predictive Tax Liability Estimation
const predictTaxLiability = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period, projectionMonths = 3 } = req.query;
    
    // Get historical data
    const historicalReturns = await GSTReturn.find({
      user: userId,
      status: 'filed'
    }).sort({ 'period.year': -1, 'period.month': -1 }).limit(12);
    
    if (historicalReturns.length < 3) {
      return res.json({
        success: true,
        prediction: {
          message: 'Insufficient historical data for accurate prediction. Need at least 3 filed returns.',
          recommendation: 'Continue filing returns to enable predictive analysis.'
        }
      });
    }
    
    // Calculate trends
    const trends = calculateTaxTrends(historicalReturns);
    
    // Generate predictions
    const predictions = [];
    for (let i = 1; i <= projectionMonths; i++) {
      const prediction = generateMonthlyPrediction(trends, i);
      predictions.push(prediction);
    }
    
    // Calculate total projected liability
    const totalProjectedLiability = predictions.reduce((sum, pred) => sum + pred.totalTax, 0);
    
    res.json({
      success: true,
      prediction: {
        totalProjectedLiability: Math.round(totalProjectedLiability * 100) / 100,
        monthlyPredictions: predictions,
        trends: {
          averageMonthlyTax: trends.averageMonthlyTax,
          growthRate: trends.growthRate,
          seasonality: trends.seasonality
        },
        recommendations: generateTaxPlanningRecommendations(trends, totalProjectedLiability)
      }
    });
  } catch (error) {
    console.error('Predict tax liability error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting tax liability'
    });
  }
};

// Document Verification & Error Detection
const verifyDocument = async (req, res) => {
  try {
    const { documentType, documentData } = req.body;
    
    let verificationResult = {};
    
    switch (documentType) {
      case 'gst_return':
        verificationResult = await verifyGSTReturn(documentData);
        break;
      case 'eway_bill':
        verificationResult = await verifyEWayBill(documentData);
        break;
      case 'invoice':
        verificationResult = await verifyInvoice(documentData);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Unsupported document type'
        });
    }
    
    res.json({
      success: true,
      verification: verificationResult
    });
  } catch (error) {
    console.error('Document verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying document'
    });
  }
};

// Get compliance analytics
const getComplianceAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = '12months' } = req.query;
    
    const analytics = await generateComplianceAnalytics(userId, period);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    console.error('Get compliance analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching compliance analytics'
    });
  }
};

// Utility functions
const findUsersWithDueReturns = async (dueDate) => {
  // This is a simplified version - in production, you'd have a more sophisticated system
  // to track individual user return due dates based on their registration and filing frequency
  
  const users = await User.find({ 
    isActive: true,
    'preferences.notifications.email': true 
  });
  
  return users.filter(user => {
    // Logic to determine if user has returns due on the target date
    // This would be based on their GST registration details and filing frequency
    return true; // Simplified for demo
  });
};

const calculateUserComplianceScore = async (userId) => {
  const overdueReturns = await GSTReturn.findOverdueReturns(userId);
  const expiringEWayBills = await EWayBill.findExpiringEWayBills(7);
  
  let score = 100;
  score -= overdueReturns.length * 10;
  score -= expiringEWayBills.length * 2;
  
  return {
    score: Math.max(0, score),
    overdueReturns: overdueReturns.length,
    expiringEWayBills: expiringEWayBills.length,
    issues: [
      ...overdueReturns.map(ret => ({
        type: 'overdue_return',
        description: `${ret.returnType} for ${ret.periodString} is overdue`,
        severity: 'high'
      })),
      ...expiringEWayBills.map(ewb => ({
        type: 'expiring_ewb',
        description: `E-Way Bill ${ewb.ewbNo} expires soon`,
        severity: 'medium'
      }))
    ]
  };
};

const calculateTaxTrends = (historicalReturns) => {
  const monthlyTaxAmounts = historicalReturns.map(ret => ret.calculateTotalTax());
  const averageMonthlyTax = monthlyTaxAmounts.reduce((sum, amount) => sum + amount, 0) / monthlyTaxAmounts.length;
  
  // Calculate growth rate (simplified)
  const recentAvg = monthlyTaxAmounts.slice(0, 3).reduce((sum, amount) => sum + amount, 0) / 3;
  const olderAvg = monthlyTaxAmounts.slice(-3).reduce((sum, amount) => sum + amount, 0) / 3;
  const growthRate = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  return {
    averageMonthlyTax,
    growthRate,
    seasonality: calculateSeasonality(historicalReturns)
  };
};

const calculateSeasonality = (historicalReturns) => {
  // Simplified seasonality calculation
  const monthlyData = {};
  
  historicalReturns.forEach(ret => {
    const month = ret.period.month;
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(ret.calculateTotalTax());
  });
  
  const seasonalityFactors = {};
  Object.keys(monthlyData).forEach(month => {
    const avg = monthlyData[month].reduce((sum, amount) => sum + amount, 0) / monthlyData[month].length;
    seasonalityFactors[month] = avg;
  });
  
  return seasonalityFactors;
};

const generateMonthlyPrediction = (trends, monthsAhead) => {
  const baseAmount = trends.averageMonthlyTax;
  const growthFactor = Math.pow(1 + trends.growthRate / 100, monthsAhead);
  const predictedAmount = baseAmount * growthFactor;
  
  return {
    month: monthsAhead,
    totalTax: Math.round(predictedAmount * 100) / 100,
    confidence: Math.max(0.5, 1 - (monthsAhead * 0.1)) // Confidence decreases with time
  };
};

const generateTaxPlanningRecommendations = (trends, totalProjectedLiability) => {
  const recommendations = [];
  
  if (trends.growthRate > 20) {
    recommendations.push('Consider setting aside additional funds for increasing tax liability');
  }
  
  if (totalProjectedLiability > 100000) {
    recommendations.push('Explore tax optimization strategies for high liability amounts');
  }
  
  recommendations.push('Review and optimize input tax credit claims');
  recommendations.push('Consider quarterly tax planning reviews');
  
  return recommendations;
};

const verifyGSTReturn = async (documentData) => {
  const errors = [];
  const warnings = [];
  
  // Basic validations
  if (!documentData.gstin || !documentData.gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
    errors.push({ field: 'gstin', message: 'Invalid GSTIN format' });
  }
  
  // Mathematical validations
  if (documentData.gstr3bData) {
    const calculatedTotal = calculateGSTR3BTotal(documentData.gstr3bData);
    if (Math.abs(calculatedTotal - documentData.totalTaxAmount) > 0.01) {
      errors.push({ field: 'totalTaxAmount', message: 'Total tax amount does not match calculated value' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  };
};

const verifyEWayBill = async (documentData) => {
  const errors = [];
  const warnings = [];
  
  // Distance validation
  if (documentData.transDistance > 1000) {
    warnings.push({ field: 'transDistance', message: 'Very long transport distance - please verify' });
  }
  
  // Value validation
  if (documentData.totalInvoiceValue < 50000 && documentData.transDistance < 10) {
    warnings.push({ field: 'totalInvoiceValue', message: 'E-Way Bill may not be required for this transaction' });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  };
};

const verifyInvoice = async (documentData) => {
  const errors = [];
  const warnings = [];
  
  // GST calculation verification
  if (documentData.items) {
    let calculatedGST = 0;
    documentData.items.forEach(item => {
      calculatedGST += (item.taxableAmount * item.gstRate) / 100;
    });
    
    if (Math.abs(calculatedGST - documentData.totalGST) > 0.01) {
      errors.push({ field: 'totalGST', message: 'GST calculation mismatch' });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
  };
};

const calculateGSTR3BTotal = (gstr3bData) => {
  // Simplified calculation - in production, this would be more comprehensive
  let total = 0;
  
  if (gstr3bData.sup_details) {
    total += gstr3bData.sup_details.osup_det?.iamt || 0;
    total += gstr3bData.sup_details.osup_det?.camt || 0;
    total += gstr3bData.sup_details.osup_det?.samt || 0;
  }
  
  return total;
};

const generateComplianceAnalytics = async (userId, period) => {
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '3months':
      startDate.setMonth(startDate.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '12months':
    default:
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
  }
  
  const returns = await GSTReturn.find({
    user: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  const eWayBills = await EWayBill.find({
    user: userId,
    createdAt: { $gte: startDate, $lte: endDate }
  });
  
  return {
    period,
    summary: {
      totalReturns: returns.length,
      filedReturns: returns.filter(ret => ret.status === 'filed').length,
      overdueReturns: returns.filter(ret => ret.isOverdue).length,
      totalEWayBills: eWayBills.length,
      generatedEWayBills: eWayBills.filter(ewb => ewb.status === 'generated').length
    },
    trends: {
      monthlyReturns: calculateMonthlyTrends(returns),
      monthlyEWayBills: calculateMonthlyTrends(eWayBills)
    },
    complianceScore: await calculateUserComplianceScore(userId)
  };
};

const calculateMonthlyTrends = (documents) => {
  const monthlyData = {};
  
  documents.forEach(doc => {
    const monthKey = `${doc.createdAt.getFullYear()}-${doc.createdAt.getMonth() + 1}`;
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
  });
  
  return monthlyData;
};

// Email templates
const sendReturnDueReminderEmail = async (user, days) => {
  const subject = `GST Return Due in ${days} day${days > 1 ? 's' : ''} - GSTPAssociation`;
  const content = `
    <h2>GST Return Due Reminder</h2>
    <p>Dear ${user.name},</p>
    <p>This is a reminder that your GST return is due in ${days} day${days > 1 ? 's' : ''}.</p>
    <p>Please ensure timely filing to avoid penalties and interest.</p>
    <p><a href="${process.env.FRONTEND_URL}/gst/returns" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">File Return Now</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendEWayBillExpiryEmail = async (user, eWayBill) => {
  const subject = `E-Way Bill Expiring Soon - ${eWayBill.ewbNo}`;
  const content = `
    <h2>E-Way Bill Expiry Alert</h2>
    <p>Dear ${user.name},</p>
    <p>Your E-Way Bill ${eWayBill.ewbNo} is expiring on ${eWayBill.validUpto.toDateString()}.</p>
    <p>Please take necessary action to extend or update the E-Way Bill.</p>
  `;
  
  await sendEmail(user.email, subject, content);
};

const sendComplianceScoreEmail = async (user, complianceData) => {
  const subject = `Weekly Compliance Update - Score: ${complianceData.score}%`;
  const content = `
    <h2>Your Weekly Compliance Update</h2>
    <p>Dear ${user.name},</p>
    <p>Your current compliance score is <strong>${complianceData.score}%</strong>.</p>
    ${complianceData.issues.length > 0 ? `
      <h3>Issues to Address:</h3>
      <ul>
        ${complianceData.issues.map(issue => `<li>${issue.description}</li>`).join('')}
      </ul>
    ` : ''}
    <p><a href="${process.env.FRONTEND_URL}/compliance/dashboard">View Compliance Dashboard</a></p>
  `;
  
  await sendEmail(user.email, subject, content);
};

// Start compliance monitoring
const startComplianceMonitoring = () => {
  complianceReminderJob.start();
  console.log('Compliance monitoring started');
};

const stopComplianceMonitoring = () => {
  complianceReminderJob.stop();
  console.log('Compliance monitoring stopped');
};

module.exports = {
  startComplianceMonitoring,
  stopComplianceMonitoring,
  predictTaxLiability,
  verifyDocument,
  getComplianceAnalytics
};
