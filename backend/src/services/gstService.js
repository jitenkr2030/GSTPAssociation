const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const HSNCode = require('../models/HSNCode');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// GST Calculator Service
const calculateGST = async (req, res) => {
  try {
    const { amount, gstRate, type = 'exclusive', hsnCode } = req.body;

    let taxableAmount, gstAmount, totalAmount;
    let cgst = 0, sgst = 0, igst = 0, cess = 0;

    // Get HSN code details if provided
    let hsnDetails = null;
    if (hsnCode) {
      hsnDetails = await HSNCode.findOne({ code: hsnCode });
      if (hsnDetails) {
        await hsnDetails.incrementUsage();
      }
    }

    if (type === 'inclusive') {
      // GST is included in the amount
      totalAmount = amount;
      taxableAmount = amount / (1 + gstRate / 100);
      gstAmount = amount - taxableAmount;
    } else {
      // GST is exclusive
      taxableAmount = amount;
      gstAmount = (amount * gstRate) / 100;
      totalAmount = amount + gstAmount;
    }

    // Calculate CGST, SGST, IGST based on HSN code or default split
    if (hsnDetails) {
      cgst = (taxableAmount * hsnDetails.gstRates.cgst) / 100;
      sgst = (taxableAmount * hsnDetails.gstRates.sgst) / 100;
      igst = (taxableAmount * hsnDetails.gstRates.igst) / 100;
      cess = (taxableAmount * hsnDetails.gstRates.cess) / 100;
    } else {
      // Default: assume intra-state transaction (CGST + SGST)
      cgst = gstAmount / 2;
      sgst = gstAmount / 2;
    }

    const calculation = {
      input: { amount, gstRate, type, hsnCode },
      result: {
        taxableAmount: Math.round(taxableAmount * 100) / 100,
        gstAmount: Math.round(gstAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        breakdown: {
          cgst: Math.round(cgst * 100) / 100,
          sgst: Math.round(sgst * 100) / 100,
          igst: Math.round(igst * 100) / 100,
          cess: Math.round(cess * 100) / 100
        }
      },
      hsnDetails: hsnDetails ? {
        code: hsnDetails.code,
        description: hsnDetails.description,
        gstRates: hsnDetails.gstRates
      } : null
    };

    res.json({
      success: true,
      calculation
    });
  } catch (error) {
    console.error('GST calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating GST'
    });
  }
};

// HSN Code Lookup Service
const searchHSNCodes = async (req, res) => {
  try {
    const {
      query,
      limit = 20,
      skip = 0,
      category,
      gstRate,
      sortBy = 'code'
    } = req.query;

    const codes = await HSNCode.searchCodes(query, {
      limit: parseInt(limit),
      skip: parseInt(skip),
      category,
      gstRate: gstRate ? parseFloat(gstRate) : null,
      sortBy
    });

    const total = await HSNCode.countDocuments({
      isActive: true,
      ...(query && {
        $or: [
          { code: new RegExp(query, 'i') },
          { description: new RegExp(query, 'i') },
          { chapterDescription: new RegExp(query, 'i') },
          { headingDescription: new RegExp(query, 'i') }
        ]
      }),
      ...(category && { category }),
      ...(gstRate && { 'gstRates.igst': parseFloat(gstRate) })
    });

    res.json({
      success: true,
      codes,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('HSN code search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching HSN codes'
    });
  }
};

// Get HSN Code Details
const getHSNCodeDetails = async (req, res) => {
  try {
    const { code } = req.params;

    const hsnCode = await HSNCode.findOne({ code, isActive: true });

    if (!hsnCode) {
      return res.status(404).json({
        success: false,
        message: 'HSN code not found'
      });
    }

    await hsnCode.incrementUsage();

    res.json({
      success: true,
      hsnCode
    });
  } catch (error) {
    console.error('Get HSN code error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching HSN code details'
    });
  }
};

// GST Return Filing Services
const createGSTReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const returnData = req.body;

    // Validate user has permission to file returns
    const user = await User.findById(userId);
    if (!user.isMembershipActive() || user.membership.type === 'free') {
      return res.status(403).json({
        success: false,
        message: 'Premium membership required for GST return filing'
      });
    }

    // Create new GST return
    const gstReturn = new GSTReturn({
      ...returnData,
      user: userId,
      dueDate: GSTReturn.getDueDate(returnData.returnType, returnData.period.month, returnData.period.year)
    });

    // Validate return data
    const validationErrors = gstReturn.validateReturnData();
    if (validationErrors.some(error => error.severity === 'error')) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors: validationErrors
      });
    }

    await gstReturn.save();

    res.status(201).json({
      success: true,
      message: 'GST return created successfully',
      gstReturn
    });
  } catch (error) {
    console.error('Create GST return error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating GST return'
    });
  }
};

// Get user's GST returns
const getUserGSTReturns = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, returnType, year, limit = 20, skip = 0 } = req.query;

    let query = { user: userId };

    if (status) query.status = status;
    if (returnType) query.returnType = returnType;
    if (year) query['period.year'] = parseInt(year);

    const returns = await GSTReturn.find(query)
      .sort({ 'period.year': -1, 'period.month': -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await GSTReturn.countDocuments(query);

    res.json({
      success: true,
      returns,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get GST returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching GST returns'
    });
  }
};

// File GST return
const fileGSTReturn = async (req, res) => {
  try {
    const { returnId } = req.params;
    const userId = req.user.id;

    const gstReturn = await GSTReturn.findOne({ _id: returnId, user: userId });

    if (!gstReturn) {
      return res.status(404).json({
        success: false,
        message: 'GST return not found'
      });
    }

    if (gstReturn.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft returns can be filed'
      });
    }

    // Validate return data before filing
    const validationErrors = gstReturn.validateReturnData();
    if (validationErrors.some(error => error.severity === 'error')) {
      return res.status(400).json({
        success: false,
        message: 'Cannot file return with validation errors',
        errors: validationErrors
      });
    }

    // Simulate filing process (in real implementation, this would integrate with GSTN API)
    gstReturn.status = 'filed';
    gstReturn.filingDate = new Date();
    gstReturn.acknowledgmentNumber = `ACK${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    gstReturn.submissionHistory.push({
      action: 'Filed',
      user: userId,
      details: 'Return filed successfully'
    });

    await gstReturn.save();

    // Send confirmation email
    const user = await User.findById(userId);
    await sendGSTReturnFiledEmail(user, gstReturn);

    res.json({
      success: true,
      message: 'GST return filed successfully',
      gstReturn
    });
  } catch (error) {
    console.error('File GST return error:', error);
    res.status(500).json({
      success: false,
      message: 'Error filing GST return'
    });
  }
};

// E-Way Bill Services
const createEWayBill = async (req, res) => {
  try {
    const userId = req.user.id;
    const eWayBillData = req.body;

    const eWayBill = new EWayBill({
      ...eWayBillData,
      user: userId
    });

    // Calculate totals
    eWayBill.calculateTotals();

    // Validate e-way bill data
    const validationErrors = eWayBill.validateEWayBillData();
    if (validationErrors.some(error => error.severity === 'error')) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        errors: validationErrors
      });
    }

    await eWayBill.save();

    res.status(201).json({
      success: true,
      message: 'E-Way Bill created successfully',
      eWayBill
    });
  } catch (error) {
    console.error('Create E-Way Bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating E-Way Bill'
    });
  }
};

// Generate E-Way Bill
const generateEWayBill = async (req, res) => {
  try {
    const { eWayBillId } = req.params;
    const userId = req.user.id;

    const eWayBill = await EWayBill.findOne({ _id: eWayBillId, user: userId });

    if (!eWayBill) {
      return res.status(404).json({
        success: false,
        message: 'E-Way Bill not found'
      });
    }

    if (eWayBill.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft E-Way Bills can be generated'
      });
    }

    // Simulate generation (in real implementation, integrate with E-Way Bill API)
    eWayBill.status = 'generated';
    eWayBill.ewbNo = `EWB${Date.now()}`;
    eWayBill.generatedDate = new Date();
    eWayBill.validUpto = new Date(Date.now() + 24 * 60 * 60 * 1000); // Valid for 24 hours

    await eWayBill.save();

    res.json({
      success: true,
      message: 'E-Way Bill generated successfully',
      eWayBill
    });
  } catch (error) {
    console.error('Generate E-Way Bill error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating E-Way Bill'
    });
  }
};

// Get user's E-Way Bills
const getUserEWayBills = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 20, skip = 0 } = req.query;

    let query = { user: userId };
    if (status) query.status = status;

    const eWayBills = await EWayBill.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await EWayBill.countDocuments(query);

    res.json({
      success: true,
      eWayBills,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: total > parseInt(skip) + parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Get E-Way Bills error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching E-Way Bills'
    });
  }
};

// Input Tax Credit Calculator
const calculateITC = async (req, res) => {
  try {
    const { purchases, eligibilityType = 'full' } = req.body;

    let totalITC = 0;
    let eligibleITC = 0;
    let ineligibleITC = 0;

    const breakdown = purchases.map(purchase => {
      const { amount, gstRate, category = 'eligible' } = purchase;
      const gstAmount = (amount * gstRate) / 100;

      let eligible = 0;
      let ineligible = 0;

      if (category === 'eligible') {
        eligible = gstAmount;
      } else if (category === 'partially_eligible') {
        eligible = gstAmount * 0.5; // 50% eligible for certain categories
        ineligible = gstAmount * 0.5;
      } else {
        ineligible = gstAmount;
      }

      totalITC += gstAmount;
      eligibleITC += eligible;
      ineligibleITC += ineligible;

      return {
        ...purchase,
        gstAmount,
        eligibleITC: eligible,
        ineligibleITC: ineligible
      };
    });

    res.json({
      success: true,
      calculation: {
        totalITC: Math.round(totalITC * 100) / 100,
        eligibleITC: Math.round(eligibleITC * 100) / 100,
        ineligibleITC: Math.round(ineligibleITC * 100) / 100,
        breakdown
      }
    });
  } catch (error) {
    console.error('ITC calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating ITC'
    });
  }
};

// TDS/TCS Calculator
const calculateTDSTCS = async (req, res) => {
  try {
    const { amount, type, section, supplierType = 'registered' } = req.body;

    let rate = 0;
    let threshold = 0;

    // TDS rates under GST
    if (type === 'TDS') {
      if (section === '51') {
        rate = 2; // 2% TDS on supply of goods/services
        threshold = 250000; // Annual threshold
      } else if (section === '52') {
        rate = 1; // 1% TDS on e-commerce transactions
        threshold = 0; // No threshold
      }
    }

    // TCS rates under GST
    if (type === 'TCS') {
      if (section === '52') {
        rate = 1; // 1% TCS on e-commerce sales
        threshold = 0;
      }
    }

    const taxAmount = amount >= threshold ? (amount * rate) / 100 : 0;
    const netAmount = type === 'TDS' ? amount - taxAmount : amount;
    const totalAmount = type === 'TCS' ? amount + taxAmount : amount;

    res.json({
      success: true,
      calculation: {
        type,
        section,
        rate,
        threshold,
        amount,
        taxAmount: Math.round(taxAmount * 100) / 100,
        netAmount: Math.round(netAmount * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        applicable: amount >= threshold
      }
    });
  } catch (error) {
    console.error('TDS/TCS calculation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating TDS/TCS'
    });
  }
};

// Compliance Dashboard
const getComplianceDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get overdue returns
    const overdueReturns = await GSTReturn.findOverdueReturns(userId);

    // Get expiring E-Way Bills
    const expiringEWayBills = await EWayBill.findExpiringEWayBills(1);

    // Get recent activity
    const recentReturns = await GSTReturn.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    const recentEWayBills = await EWayBill.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      dashboard: {
        overdueReturns: overdueReturns.length,
        expiringEWayBills: expiringEWayBills.length,
        recentActivity: {
          returns: recentReturns,
          eWayBills: recentEWayBills
        },
        alerts: [
          ...overdueReturns.map(ret => ({
            type: 'overdue_return',
            message: `${ret.returnType} for ${ret.periodString} is overdue`,
            severity: 'high',
            dueDate: ret.dueDate
          })),
          ...expiringEWayBills.map(ewb => ({
            type: 'expiring_ewb',
            message: `E-Way Bill ${ewb.ewbNo} expires in ${ewb.daysUntilExpiry} day(s)`,
            severity: 'medium',
            expiryDate: ewb.validUpto
          }))
        ]
      }
    });
  } catch (error) {
    console.error('Get compliance dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching compliance dashboard'
    });
  }
};

// Email utility function
const sendGSTReturnFiledEmail = async (user, gstReturn) => {
  const subject = `GST Return Filed Successfully - ${gstReturn.returnType}`;
  const content = `
    <h2>GST Return Filed Successfully</h2>
    <p>Dear ${user.name},</p>
    <p>Your ${gstReturn.returnType} for ${gstReturn.periodString} has been filed successfully.</p>
    <h3>Details:</h3>
    <ul>
      <li><strong>Return Type:</strong> ${gstReturn.returnType}</li>
      <li><strong>Period:</strong> ${gstReturn.periodString}</li>
      <li><strong>GSTIN:</strong> ${gstReturn.gstin}</li>
      <li><strong>Filing Date:</strong> ${gstReturn.filingDate.toDateString()}</li>
      <li><strong>Acknowledgment Number:</strong> ${gstReturn.acknowledgmentNumber}</li>
    </ul>
    <p>Thank you for using GSTPAssociation!</p>
  `;

  await sendEmail(user.email, subject, content);
};

module.exports = {
  calculateGST,
  searchHSNCodes,
  getHSNCodeDetails,
  createGSTReturn,
  getUserGSTReturns,
  fileGSTReturn,
  createEWayBill,
  generateEWayBill,
  getUserEWayBills,
  calculateITC,
  calculateTDSTCS,
  getComplianceDashboard
};
