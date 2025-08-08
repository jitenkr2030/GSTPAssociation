const AuditLog = require('../models/AuditLog');
const geoip = require('geoip-lite');
const crypto = require('crypto');

// Audit logging middleware
const auditLogger = (options = {}) => {
  const {
    excludePaths = ['/health', '/metrics'],
    excludeActions = [],
    sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn', 'pan'],
    logLevel = 'ALL' // ALL, SECURITY_ONLY, BUSINESS_ONLY
  } = options;

  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Skip excluded paths
    if (excludePaths.some(path => req.path.includes(path))) {
      return next();
    }

    // Capture original response methods
    const originalSend = res.send;
    const originalJson = res.json;
    
    let responseBody = null;
    let responseStatusCode = null;

    // Override response methods to capture response data
    res.send = function(body) {
      responseBody = body;
      responseStatusCode = res.statusCode;
      return originalSend.call(this, body);
    };

    res.json = function(body) {
      responseBody = body;
      responseStatusCode = res.statusCode;
      return originalJson.call(this, body);
    };

    // Continue with request processing
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const endTime = Date.now();
        const processingTime = endTime - startTime;

        // Determine action based on request
        const action = determineAction(req, res);
        
        // Skip if action is excluded
        if (excludeActions.includes(action)) {
          return;
        }

        // Skip based on log level
        if (logLevel === 'SECURITY_ONLY' && !isSecurityAction(action)) {
          return;
        }
        if (logLevel === 'BUSINESS_ONLY' && !isBusinessAction(action)) {
          return;
        }

        // Get user information
        const user = req.user || null;
        const ip = getClientIP(req);
        const geoLocation = geoip.lookup(ip);

        // Create audit log entry
        const auditData = {
          user: user?._id,
          userEmail: user?.email || 'anonymous',
          userName: user?.name || 'anonymous',
          userRole: user?.role || 'guest',
          
          action,
          
          resource: determineResource(req, res),
          
          request: {
            method: req.method,
            url: req.originalUrl,
            userAgent: req.get('User-Agent'),
            ip,
            headers: filterSensitiveHeaders(req.headers),
            body: filterSensitiveData(req.body, sensitiveFields),
            query: req.query
          },
          
          response: {
            statusCode: responseStatusCode,
            success: responseStatusCode < 400,
            message: extractResponseMessage(responseBody),
            errorCode: extractErrorCode(responseBody),
            processingTime
          },
          
          changes: extractChanges(req, res),
          
          security: {
            riskLevel: assessRiskLevel(req, res, user),
            threatIndicators: detectThreats(req, res),
            geoLocation: geoLocation ? {
              country: geoLocation.country,
              region: geoLocation.region,
              city: geoLocation.city,
              latitude: geoLocation.ll?.[0],
              longitude: geoLocation.ll?.[1]
            } : null,
            deviceFingerprint: generateDeviceFingerprint(req),
            sessionId: req.sessionID,
            isAnonymous: !user
          },
          
          business: extractBusinessContext(req, res),
          
          compliance: {
            dataClassification: determineDataClassification(req, res),
            personalDataInvolved: containsPersonalData(req, res),
            regulatoryRequirement: determineRegulatoryRequirements(req, res)
          },
          
          metadata: {
            tags: generateTags(req, res),
            category: categorizeAction(action),
            priority: determinePriority(req, res),
            correlationId: req.headers['x-correlation-id'] || generateCorrelationId()
          }
        };

        // Save audit log
        await AuditLog.create(auditData);

        // Check for security anomalies
        if (user && auditData.security.riskLevel !== 'LOW') {
          await checkSecurityAnomalies(user._id, auditData);
        }

      } catch (error) {
        console.error('Audit logging error:', error);
        // Don't throw error to avoid breaking the main request flow
      }
    });
  };
};

// Helper functions
const determineAction = (req, res) => {
  const method = req.method;
  const path = req.path;
  const statusCode = res.statusCode;

  // Authentication actions
  if (path.includes('/auth/login')) return statusCode < 400 ? 'LOGIN' : 'LOGIN_FAILED';
  if (path.includes('/auth/logout')) return 'LOGOUT';
  if (path.includes('/auth/reset-password')) return 'PASSWORD_RESET';
  if (path.includes('/auth/change-password')) return 'PASSWORD_CHANGED';

  // GST actions
  if (path.includes('/gst/returns')) {
    if (method === 'POST') return 'GST_RETURN_CREATED';
    if (method === 'PUT' && path.includes('/file')) return 'GST_RETURN_FILED';
    if (method === 'DELETE') return 'GST_RETURN_DELETED';
  }
  if (path.includes('/gst/calculator')) return 'GST_CALCULATION';
  if (path.includes('/eway-bills')) {
    if (method === 'POST') return 'EWAY_BILL_GENERATED';
    if (method === 'DELETE') return 'EWAY_BILL_CANCELLED';
  }

  // Payment actions
  if (path.includes('/payments')) {
    if (method === 'POST') return 'PAYMENT_INITIATED';
    if (path.includes('/webhook')) return 'PAYMENT_COMPLETED';
  }

  // Data actions
  if (method === 'POST') return 'DATA_CREATED';
  if (method === 'PUT' || method === 'PATCH') return 'DATA_UPDATED';
  if (method === 'DELETE') return 'DATA_DELETED';
  if (method === 'GET') return 'DATA_VIEWED';

  return 'API_CALL';
};

const determineResource = (req, res) => {
  const path = req.path;
  
  if (path.includes('/users')) return { type: 'User', id: req.params.id };
  if (path.includes('/gst/returns')) return { type: 'GSTReturn', id: req.params.id };
  if (path.includes('/eway-bills')) return { type: 'EWayBill', id: req.params.id };
  if (path.includes('/invoices')) return { type: 'Invoice', id: req.params.id };
  if (path.includes('/subscriptions')) return { type: 'Subscription', id: req.params.id };
  if (path.includes('/articles')) return { type: 'Article', id: req.params.id };
  if (path.includes('/courses')) return { type: 'Course', id: req.params.id };
  if (path.includes('/webinars')) return { type: 'Webinar', id: req.params.id };
  if (path.includes('/forum')) return { type: 'Forum', id: req.params.id };
  if (path.includes('/payments')) return { type: 'Payment', id: req.params.id };
  
  return { type: 'System' };
};

const getClientIP = (req) => {
  return req.headers['x-forwarded-for'] ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         req.ip;
};

const filterSensitiveHeaders = (headers) => {
  const filtered = { ...headers };
  const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
  
  sensitiveHeaders.forEach(header => {
    if (filtered[header]) {
      filtered[header] = '[REDACTED]';
    }
  });
  
  return filtered;
};

const filterSensitiveData = (data, sensitiveFields) => {
  if (!data || typeof data !== 'object') return data;
  
  const filtered = JSON.parse(JSON.stringify(data));
  
  const filterRecursive = (obj) => {
    for (const key in obj) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
        obj[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        filterRecursive(obj[key]);
      }
    }
  };
  
  filterRecursive(filtered);
  return filtered;
};

const extractResponseMessage = (responseBody) => {
  if (!responseBody) return null;
  
  try {
    const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    return parsed.message || parsed.error || null;
  } catch {
    return null;
  }
};

const extractErrorCode = (responseBody) => {
  if (!responseBody) return null;
  
  try {
    const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
    return parsed.errorCode || parsed.code || null;
  } catch {
    return null;
  }
};

const extractChanges = (req, res) => {
  // This would be implemented to track changes in update operations
  // For now, returning null
  return null;
};

const assessRiskLevel = (req, res, user) => {
  let riskScore = 0;
  
  // High risk for failed authentication
  if (req.path.includes('/auth') && res.statusCode >= 400) riskScore += 30;
  
  // High risk for admin actions
  if (user?.role === 'admin') riskScore += 20;
  
  // Medium risk for financial operations
  if (req.path.includes('/payment') || req.path.includes('/subscription')) riskScore += 15;
  
  // Low risk for anonymous users on sensitive endpoints
  if (!user && (req.path.includes('/admin') || req.path.includes('/user'))) riskScore += 25;
  
  // High risk for unusual hours (outside 6 AM - 10 PM IST)
  const hour = new Date().getHours();
  if (hour < 6 || hour > 22) riskScore += 10;
  
  if (riskScore >= 40) return 'CRITICAL';
  if (riskScore >= 25) return 'HIGH';
  if (riskScore >= 10) return 'MEDIUM';
  return 'LOW';
};

const detectThreats = (req, res) => {
  const threats = [];
  
  // SQL injection patterns
  const sqlPatterns = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|OR|AND)\b)/i;
  const queryString = JSON.stringify(req.query) + JSON.stringify(req.body);
  if (sqlPatterns.test(queryString)) {
    threats.push('SQL_INJECTION_ATTEMPT');
  }
  
  // XSS patterns
  const xssPatterns = /<script|javascript:|on\w+\s*=/i;
  if (xssPatterns.test(queryString)) {
    threats.push('XSS_ATTEMPT');
  }
  
  // Rate limiting indicators
  if (res.statusCode === 429) {
    threats.push('RATE_LIMIT_EXCEEDED');
  }
  
  // Failed authentication
  if (req.path.includes('/auth') && res.statusCode === 401) {
    threats.push('AUTHENTICATION_FAILURE');
  }
  
  return threats;
};

const generateDeviceFingerprint = (req) => {
  const userAgent = req.get('User-Agent') || '';
  const acceptLanguage = req.get('Accept-Language') || '';
  const acceptEncoding = req.get('Accept-Encoding') || '';
  
  const fingerprint = crypto
    .createHash('sha256')
    .update(userAgent + acceptLanguage + acceptEncoding)
    .digest('hex');
  
  return fingerprint.substring(0, 16);
};

const extractBusinessContext = (req, res) => {
  const path = req.path;
  
  let module = 'General';
  let feature = 'Unknown';
  
  if (path.includes('/gst')) {
    module = 'GST';
    if (path.includes('/calculator')) feature = 'Calculator';
    if (path.includes('/returns')) feature = 'Return Filing';
    if (path.includes('/eway-bills')) feature = 'E-Way Bills';
  } else if (path.includes('/payment')) {
    module = 'Payments';
    feature = 'Payment Processing';
  } else if (path.includes('/subscription')) {
    module = 'Subscriptions';
    feature = 'Subscription Management';
  } else if (path.includes('/course') || path.includes('/webinar')) {
    module = 'Learning';
    feature = path.includes('/course') ? 'Courses' : 'Webinars';
  }
  
  return { module, feature };
};

const determineDataClassification = (req, res) => {
  const path = req.path;
  
  if (path.includes('/admin') || path.includes('/payment')) return 'RESTRICTED';
  if (path.includes('/user') || path.includes('/profile')) return 'CONFIDENTIAL';
  if (path.includes('/gst') || path.includes('/subscription')) return 'INTERNAL';
  return 'PUBLIC';
};

const containsPersonalData = (req, res) => {
  const personalDataFields = ['email', 'phone', 'name', 'address', 'pan', 'gstin'];
  const dataString = JSON.stringify(req.body) + JSON.stringify(req.query);
  
  return personalDataFields.some(field => 
    dataString.toLowerCase().includes(field.toLowerCase())
  );
};

const determineRegulatoryRequirements = (req, res) => {
  const requirements = [];
  
  if (containsPersonalData(req, res)) requirements.push('GDPR', 'DPDP');
  if (req.path.includes('/payment') || req.path.includes('/financial')) requirements.push('PCI_DSS');
  if (req.path.includes('/gst')) requirements.push('GST_COMPLIANCE');
  
  return requirements;
};

const generateTags = (req, res) => {
  const tags = [];
  
  if (req.method === 'POST') tags.push('CREATE');
  if (req.method === 'PUT' || req.method === 'PATCH') tags.push('UPDATE');
  if (req.method === 'DELETE') tags.push('DELETE');
  if (req.method === 'GET') tags.push('READ');
  
  if (res.statusCode >= 400) tags.push('ERROR');
  if (res.statusCode >= 500) tags.push('SERVER_ERROR');
  
  return tags;
};

const categorizeAction = (action) => {
  if (action.includes('LOGIN') || action.includes('AUTH')) return 'Authentication';
  if (action.includes('GST') || action.includes('EWAY')) return 'GST Compliance';
  if (action.includes('PAYMENT') || action.includes('SUBSCRIPTION')) return 'Financial';
  if (action.includes('USER') || action.includes('ADMIN')) return 'User Management';
  return 'General';
};

const determinePriority = (req, res) => {
  if (res.statusCode >= 500) return 'URGENT';
  if (res.statusCode >= 400) return 'HIGH';
  if (req.path.includes('/payment') || req.path.includes('/admin')) return 'HIGH';
  return 'MEDIUM';
};

const generateCorrelationId = () => {
  return crypto.randomBytes(16).toString('hex');
};

const isSecurityAction = (action) => {
  const securityActions = [
    'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
    'ACCOUNT_LOCKED', 'UNAUTHORIZED_ACCESS_ATTEMPT', 'SUSPICIOUS_ACTIVITY'
  ];
  return securityActions.includes(action);
};

const isBusinessAction = (action) => {
  const businessActions = [
    'GST_RETURN_CREATED', 'GST_RETURN_FILED', 'PAYMENT_COMPLETED',
    'SUBSCRIPTION_CREATED', 'EWAY_BILL_GENERATED'
  ];
  return businessActions.includes(action);
};

const checkSecurityAnomalies = async (userId, auditData) => {
  try {
    const anomalies = await AuditLog.detectAnomalies(userId, 24);
    
    if (anomalies.length > 0) {
      // Log security alert
      await AuditLog.create({
        ...auditData,
        action: 'SUSPICIOUS_ACTIVITY',
        security: {
          ...auditData.security,
          riskLevel: 'HIGH',
          threatIndicators: ['ANOMALY_DETECTED', ...auditData.security.threatIndicators]
        },
        metadata: {
          ...auditData.metadata,
          tags: ['SECURITY_ALERT', ...auditData.metadata.tags],
          priority: 'URGENT'
        }
      });
      
      // Here you could trigger additional security measures:
      // - Send alert to security team
      // - Temporarily lock account
      // - Require additional authentication
    }
  } catch (error) {
    console.error('Security anomaly check error:', error);
  }
};

module.exports = {
  auditLogger
};
