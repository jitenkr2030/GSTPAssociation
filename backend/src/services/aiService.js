const User = require('../models/User');
const GSTReturn = require('../models/GSTReturn');
const EWayBill = require('../models/EWayBill');
const HSNCode = require('../models/HSNCode');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');

// AI Chatbot for GST Queries
const processGSTQuery = async (req, res) => {
  try {
    const { query, context = {} } = req.body;
    const userId = req.user?.id;
    
    // Analyze query intent
    const intent = analyzeQueryIntent(query);
    
    let response = {};
    
    switch (intent.type) {
      case 'gst_rate_inquiry':
        response = await handleGSTRateInquiry(query, intent.entities);
        break;
      case 'return_filing':
        response = await handleReturnFilingQuery(query, intent.entities, userId);
        break;
      case 'compliance_check':
        response = await handleComplianceQuery(query, intent.entities, userId);
        break;
      case 'hsn_lookup':
        response = await handleHSNLookup(query, intent.entities);
        break;
      case 'calculation_help':
        response = await handleCalculationHelp(query, intent.entities);
        break;
      case 'general_gst':
        response = await handleGeneralGSTQuery(query, intent.entities);
        break;
      default:
        response = {
          type: 'fallback',
          message: 'I understand you have a GST-related question. Could you please be more specific? I can help with GST rates, return filing, compliance checks, HSN codes, and calculations.',
          suggestions: [
            'What is the GST rate for mobile phones?',
            'When is my GSTR-3B due?',
            'How to calculate input tax credit?',
            'What is HSN code for software services?'
          ]
        };
    }
    
    // Log the interaction for learning
    await logChatbotInteraction(userId, query, response, intent);
    
    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('AI chatbot error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing your query'
    });
  }
};

// Analyze query intent using simple NLP
const analyzeQueryIntent = (query) => {
  const lowerQuery = query.toLowerCase();
  
  // GST Rate Inquiry patterns
  if (lowerQuery.includes('gst rate') || lowerQuery.includes('tax rate') || lowerQuery.includes('what rate')) {
    return {
      type: 'gst_rate_inquiry',
      entities: extractProductEntities(query)
    };
  }
  
  // Return Filing patterns
  if (lowerQuery.includes('return') && (lowerQuery.includes('file') || lowerQuery.includes('due') || lowerQuery.includes('submit'))) {
    return {
      type: 'return_filing',
      entities: extractReturnEntities(query)
    };
  }
  
  // Compliance Check patterns
  if (lowerQuery.includes('compliance') || lowerQuery.includes('overdue') || lowerQuery.includes('penalty')) {
    return {
      type: 'compliance_check',
      entities: {}
    };
  }
  
  // HSN Lookup patterns
  if (lowerQuery.includes('hsn') || lowerQuery.includes('code') || lowerQuery.includes('classification')) {
    return {
      type: 'hsn_lookup',
      entities: extractProductEntities(query)
    };
  }
  
  // Calculation Help patterns
  if (lowerQuery.includes('calculate') || lowerQuery.includes('computation') || lowerQuery.includes('how much')) {
    return {
      type: 'calculation_help',
      entities: extractCalculationEntities(query)
    };
  }
  
  return {
    type: 'general_gst',
    entities: {}
  };
};

// Handle GST Rate Inquiry
const handleGSTRateInquiry = async (query, entities) => {
  try {
    if (entities.product) {
      // Search for HSN codes related to the product
      const hsnCodes = await HSNCode.searchCodes(entities.product, { limit: 3 });
      
      if (hsnCodes.length > 0) {
        const topResult = hsnCodes[0];
        return {
          type: 'gst_rate_response',
          message: `The GST rate for ${entities.product} (HSN: ${topResult.code}) is ${topResult.effectiveGSTRate}%.`,
          details: {
            hsnCode: topResult.code,
            description: topResult.description,
            gstRate: topResult.effectiveGSTRate,
            breakdown: {
              cgst: topResult.gstRates.cgst,
              sgst: topResult.gstRates.sgst,
              igst: topResult.gstRates.igst,
              cess: topResult.gstRates.cess
            }
          },
          relatedCodes: hsnCodes.slice(1).map(code => ({
            code: code.code,
            description: code.description,
            gstRate: code.effectiveGSTRate
          }))
        };
      }
    }
    
    return {
      type: 'gst_rate_response',
      message: 'I couldn\'t find specific GST rate information for that product. Could you provide more details or the HSN code?',
      suggestions: [
        'Try searching with HSN code',
        'Provide more specific product description',
        'Browse our HSN code directory'
      ]
    };
  } catch (error) {
    console.error('GST rate inquiry error:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error while looking up GST rates.'
    };
  }
};

// Handle Return Filing Query
const handleReturnFilingQuery = async (query, entities, userId) => {
  try {
    if (!userId) {
      return {
        type: 'auth_required',
        message: 'Please log in to get personalized return filing information.'
      };
    }
    
    const user = await User.findById(userId);
    const overdueReturns = await GSTReturn.findOverdueReturns(userId);
    
    if (overdueReturns.length > 0) {
      return {
        type: 'return_filing_response',
        message: `You have ${overdueReturns.length} overdue return(s). Here are the details:`,
        overdueReturns: overdueReturns.map(ret => ({
          returnType: ret.returnType,
          period: ret.periodString,
          dueDate: ret.dueDate,
          daysOverdue: Math.ceil((new Date() - ret.dueDate) / (1000 * 60 * 60 * 24))
        })),
        actions: [
          'File overdue returns immediately',
          'Set up compliance reminders',
          'Contact support for assistance'
        ]
      };
    }
    
    // Get upcoming due dates
    const currentDate = new Date();
    const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    
    return {
      type: 'return_filing_response',
      message: 'Your GST returns are up to date! Here are the upcoming due dates:',
      upcomingDueDates: [
        {
          returnType: 'GSTR-3B',
          period: `${nextMonth.toLocaleString('default', { month: 'long' })} ${nextMonth.getFullYear()}`,
          dueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 20)
        },
        {
          returnType: 'GSTR-1',
          period: `${nextMonth.toLocaleString('default', { month: 'long' })} ${nextMonth.getFullYear()}`,
          dueDate: new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 11)
        }
      ]
    };
  } catch (error) {
    console.error('Return filing query error:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error while checking your return status.'
    };
  }
};

// Handle Compliance Query
const handleComplianceQuery = async (query, entities, userId) => {
  try {
    if (!userId) {
      return {
        type: 'auth_required',
        message: 'Please log in to get your compliance status.'
      };
    }
    
    const overdueReturns = await GSTReturn.findOverdueReturns(userId);
    const expiringEWayBills = await EWayBill.findExpiringEWayBills(7);
    
    const complianceScore = calculateComplianceScore(overdueReturns.length, expiringEWayBills.length);
    
    return {
      type: 'compliance_response',
      message: `Your compliance score is ${complianceScore}%.`,
      details: {
        score: complianceScore,
        overdueReturns: overdueReturns.length,
        expiringEWayBills: expiringEWayBills.length,
        status: complianceScore >= 90 ? 'Excellent' : complianceScore >= 70 ? 'Good' : 'Needs Attention'
      },
      recommendations: getComplianceRecommendations(complianceScore, overdueReturns.length, expiringEWayBills.length)
    };
  } catch (error) {
    console.error('Compliance query error:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error while checking compliance status.'
    };
  }
};

// Handle HSN Lookup
const handleHSNLookup = async (query, entities) => {
  try {
    const searchTerm = entities.product || extractSearchTerm(query);
    const hsnCodes = await HSNCode.searchCodes(searchTerm, { limit: 5 });
    
    if (hsnCodes.length > 0) {
      return {
        type: 'hsn_lookup_response',
        message: `Found ${hsnCodes.length} HSN codes for "${searchTerm}":`,
        results: hsnCodes.map(code => ({
          code: code.code,
          description: code.description,
          gstRate: code.effectiveGSTRate,
          chapter: code.chapter,
          chapterDescription: code.chapterDescription
        }))
      };
    }
    
    return {
      type: 'hsn_lookup_response',
      message: `No HSN codes found for "${searchTerm}". Try using different keywords or browse by chapter.`,
      suggestions: [
        'Try more specific terms',
        'Browse HSN chapters',
        'Contact support for help'
      ]
    };
  } catch (error) {
    console.error('HSN lookup error:', error);
    return {
      type: 'error',
      message: 'Sorry, I encountered an error while searching HSN codes.'
    };
  }
};

// Handle Calculation Help
const handleCalculationHelp = async (query, entities) => {
  const calculationTypes = [
    {
      type: 'GST Calculation',
      description: 'Calculate GST amount, taxable value, and total amount',
      example: 'Calculate GST on ₹10,000 at 18%'
    },
    {
      type: 'Input Tax Credit',
      description: 'Calculate eligible ITC from purchases',
      example: 'Calculate ITC on business purchases'
    },
    {
      type: 'TDS/TCS Calculation',
      description: 'Calculate TDS or TCS under GST',
      example: 'Calculate TDS on contractor payment'
    }
  ];
  
  return {
    type: 'calculation_help_response',
    message: 'I can help you with various GST calculations:',
    calculationTypes,
    quickActions: [
      'Use GST Calculator',
      'Calculate ITC',
      'Calculate TDS/TCS'
    ]
  };
};

// Handle General GST Query
const handleGeneralGSTQuery = async (query, entities) => {
  const commonTopics = [
    {
      topic: 'GST Registration',
      description: 'Information about GST registration process and requirements'
    },
    {
      topic: 'Return Filing',
      description: 'Guide to filing various GST returns'
    },
    {
      topic: 'Input Tax Credit',
      description: 'Understanding and claiming input tax credit'
    },
    {
      topic: 'E-Way Bills',
      description: 'Generation and management of e-way bills'
    }
  ];
  
  return {
    type: 'general_response',
    message: 'I can help you with various GST topics:',
    topics: commonTopics,
    suggestions: [
      'Ask about specific GST rates',
      'Check return due dates',
      'Calculate GST amounts',
      'Look up HSN codes'
    ]
  };
};

// Utility functions
const extractProductEntities = (query) => {
  // Simple entity extraction - in production, use NLP libraries
  const words = query.toLowerCase().split(' ');
  const productKeywords = words.filter(word => 
    !['what', 'is', 'the', 'gst', 'rate', 'for', 'of', 'on', 'tax'].includes(word)
  );
  
  return {
    product: productKeywords.join(' ')
  };
};

const extractReturnEntities = (query) => {
  const returnTypes = ['gstr1', 'gstr-1', 'gstr3b', 'gstr-3b', 'gstr9', 'gstr-9'];
  const foundType = returnTypes.find(type => query.toLowerCase().includes(type));
  
  return {
    returnType: foundType ? foundType.toUpperCase().replace('-', '') : null
  };
};

const extractCalculationEntities = (query) => {
  const amountMatch = query.match(/₹?(\d+(?:,\d+)*(?:\.\d+)?)/);
  const rateMatch = query.match(/(\d+(?:\.\d+)?)%/);
  
  return {
    amount: amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : null,
    rate: rateMatch ? parseFloat(rateMatch[1]) : null
  };
};

const extractSearchTerm = (query) => {
  return query.replace(/hsn|code|classification|what|is|the|for/gi, '').trim();
};

const calculateComplianceScore = (overdueReturns, expiringEWayBills) => {
  let score = 100;
  score -= overdueReturns * 10; // -10 points per overdue return
  score -= expiringEWayBills * 2; // -2 points per expiring e-way bill
  return Math.max(0, score);
};

const getComplianceRecommendations = (score, overdueReturns, expiringEWayBills) => {
  const recommendations = [];
  
  if (overdueReturns > 0) {
    recommendations.push('File overdue returns immediately to avoid penalties');
  }
  
  if (expiringEWayBills > 0) {
    recommendations.push('Extend or update expiring e-way bills');
  }
  
  if (score < 70) {
    recommendations.push('Set up automated compliance reminders');
    recommendations.push('Consider upgrading to premium membership for better compliance tools');
  }
  
  return recommendations;
};

const logChatbotInteraction = async (userId, query, response, intent) => {
  // Log interaction for analytics and learning
  // In production, store in a separate collection for analysis
  console.log('Chatbot Interaction:', {
    userId,
    query,
    intent: intent.type,
    responseType: response.type,
    timestamp: new Date()
  });
};

module.exports = {
  processGSTQuery
};
