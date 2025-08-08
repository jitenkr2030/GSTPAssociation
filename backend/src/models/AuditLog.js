const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
    // User Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    userEmail: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    
    // Action Details
    action: {
        type: String,
        required: true,
        enum: [
            // Authentication actions
            'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'PASSWORD_RESET', 'PASSWORD_CHANGED',
            'TWO_FACTOR_ENABLED', 'TWO_FACTOR_DISABLED', 'ACCOUNT_LOCKED', 'ACCOUNT_UNLOCKED',
            
            // User management actions
            'USER_CREATED', 'USER_UPDATED', 'USER_DELETED', 'USER_ACTIVATED', 'USER_DEACTIVATED',
            'ROLE_CHANGED', 'PERMISSIONS_UPDATED',
            
            // Data actions
            'DATA_CREATED', 'DATA_UPDATED', 'DATA_DELETED', 'DATA_VIEWED', 'DATA_EXPORTED',
            'DATA_IMPORTED', 'DATA_BACKUP', 'DATA_RESTORE',
            
            // GST actions
            'GST_RETURN_CREATED', 'GST_RETURN_FILED', 'GST_RETURN_DELETED', 'GST_CALCULATION',
            'EWAY_BILL_GENERATED', 'EWAY_BILL_CANCELLED', 'HSN_CODE_LOOKUP',
            
            // Financial actions
            'PAYMENT_INITIATED', 'PAYMENT_COMPLETED', 'PAYMENT_FAILED', 'REFUND_PROCESSED',
            'SUBSCRIPTION_CREATED', 'SUBSCRIPTION_CANCELLED', 'INVOICE_GENERATED',
            
            // Content actions
            'ARTICLE_CREATED', 'ARTICLE_PUBLISHED', 'COURSE_ENROLLED', 'WEBINAR_REGISTERED',
            'FORUM_POST_CREATED', 'COMMENT_ADDED',
            
            // Admin actions
            'ADMIN_LOGIN', 'SYSTEM_CONFIG_CHANGED', 'USER_IMPERSONATED', 'BULK_ACTION',
            'CONTENT_MODERATED', 'SYSTEM_MAINTENANCE',
            
            // Security actions
            'SUSPICIOUS_ACTIVITY', 'SECURITY_BREACH', 'IP_BLOCKED', 'RATE_LIMIT_EXCEEDED',
            'UNAUTHORIZED_ACCESS_ATTEMPT', 'DATA_BREACH_DETECTED',
            
            // Integration actions
            'API_CALL', 'EXTERNAL_INTEGRATION', 'WEBHOOK_RECEIVED', 'SYNC_COMPLETED'
        ]
    },
    
    // Resource Information
    resource: {
        type: {
            type: String,
            required: true,
            enum: [
                'User', 'GSTReturn', 'EWayBill', 'Invoice', 'Subscription', 'Article', 
                'Course', 'Webinar', 'Forum', 'Payment', 'System', 'Integration'
            ]
        },
        id: mongoose.Schema.Types.ObjectId,
        name: String,
        identifier: String // For external IDs, invoice numbers, etc.
    },
    
    // Request Information
    request: {
        method: String,
        url: String,
        userAgent: String,
        ip: {
            type: String,
            required: true
        },
        headers: {
            type: Map,
            of: String
        },
        body: {
            type: mongoose.Schema.Types.Mixed,
            // Sensitive data will be filtered out
        },
        query: {
            type: Map,
            of: String
        }
    },
    
    // Response Information
    response: {
        statusCode: Number,
        success: Boolean,
        message: String,
        errorCode: String,
        processingTime: Number // in milliseconds
    },
    
    // Change Information (for update actions)
    changes: {
        before: mongoose.Schema.Types.Mixed,
        after: mongoose.Schema.Types.Mixed,
        fields: [String] // List of changed fields
    },
    
    // Security Context
    security: {
        riskLevel: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            default: 'LOW'
        },
        threatIndicators: [String],
        geoLocation: {
            country: String,
            region: String,
            city: String,
            latitude: Number,
            longitude: Number
        },
        deviceFingerprint: String,
        sessionId: String,
        isAnonymous: {
            type: Boolean,
            default: false
        }
    },
    
    // Business Context
    business: {
        module: String, // GST, Payments, Learning, etc.
        feature: String, // Return Filing, Calculator, etc.
        workflow: String, // Multi-step process identifier
        transactionId: String,
        amount: Number,
        currency: String
    },
    
    // Compliance Information
    compliance: {
        dataClassification: {
            type: String,
            enum: ['PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED'],
            default: 'INTERNAL'
        },
        retentionPeriod: {
            type: Number, // in days
            default: 2555 // 7 years for financial data
        },
        regulatoryRequirement: [String], // GDPR, SOX, etc.
        personalDataInvolved: {
            type: Boolean,
            default: false
        }
    },
    
    // Additional Metadata
    metadata: {
        tags: [String],
        category: String,
        priority: {
            type: String,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            default: 'MEDIUM'
        },
        correlationId: String, // For tracking related events
        parentEventId: mongoose.Schema.Types.ObjectId,
        childEvents: [mongoose.Schema.Types.ObjectId]
    },
    
    // Timestamps
    timestamp: {
        type: Date,
        default: Date.now,
        required: true
    },
    
    // Data retention
    expiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    }
}, {
    timestamps: true
});

// Indexes for efficient querying
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, 'resource.id': 1 });
auditLogSchema.index({ 'request.ip': 1, timestamp: -1 });
auditLogSchema.index({ 'security.riskLevel': 1, timestamp: -1 });
auditLogSchema.index({ 'business.module': 1, timestamp: -1 });
auditLogSchema.index({ 'metadata.correlationId': 1 });
auditLogSchema.index({ timestamp: -1 });

// Compound indexes for common queries
auditLogSchema.index({ user: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ 'resource.type': 1, action: 1, timestamp: -1 });
auditLogSchema.index({ 'security.riskLevel': 1, action: 1 });

// Pre-save middleware to set expiration date
auditLogSchema.pre('save', function(next) {
    if (!this.expiresAt && this.compliance.retentionPeriod) {
        this.expiresAt = new Date(Date.now() + (this.compliance.retentionPeriod * 24 * 60 * 60 * 1000));
    }
    next();
});

// Static methods for common queries
auditLogSchema.statics.getUserActivity = function(userId, options = {}) {
    const { limit = 50, skip = 0, startDate, endDate, actions } = options;
    
    let query = { user: userId };
    
    if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = startDate;
        if (endDate) query.timestamp.$lte = endDate;
    }
    
    if (actions && actions.length > 0) {
        query.action = { $in: actions };
    }
    
    return this.find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(skip)
        .populate('user', 'name email');
};

auditLogSchema.statics.getSecurityEvents = function(options = {}) {
    const { riskLevel = 'HIGH', limit = 100, skip = 0 } = options;
    
    return this.find({
        'security.riskLevel': { $in: Array.isArray(riskLevel) ? riskLevel : [riskLevel] }
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email');
};

auditLogSchema.statics.getResourceActivity = function(resourceType, resourceId, options = {}) {
    const { limit = 50, skip = 0 } = options;
    
    return this.find({
        'resource.type': resourceType,
        'resource.id': resourceId
    })
    .sort({ timestamp: -1 })
    .limit(limit)
    .skip(skip)
    .populate('user', 'name email');
};

auditLogSchema.statics.getComplianceReport = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                timestamp: { $gte: startDate, $lte: endDate }
            }
        },
        {
            $group: {
                _id: {
                    action: '$action',
                    riskLevel: '$security.riskLevel',
                    module: '$business.module'
                },
                count: { $sum: 1 },
                users: { $addToSet: '$user' },
                avgProcessingTime: { $avg: '$response.processingTime' }
            }
        },
        {
            $sort: { count: -1 }
        }
    ]);
};

auditLogSchema.statics.detectAnomalies = function(userId, timeWindow = 24) {
    const startTime = new Date(Date.now() - (timeWindow * 60 * 60 * 1000));
    
    return this.aggregate([
        {
            $match: {
                user: userId,
                timestamp: { $gte: startTime }
            }
        },
        {
            $group: {
                _id: {
                    action: '$action',
                    hour: { $hour: '$timestamp' }
                },
                count: { $sum: 1 },
                ips: { $addToSet: '$request.ip' },
                locations: { $addToSet: '$security.geoLocation.city' }
            }
        },
        {
            $match: {
                $or: [
                    { count: { $gt: 100 } }, // High frequency
                    { 'ips.1': { $exists: true } }, // Multiple IPs
                    { 'locations.1': { $exists: true } } // Multiple locations
                ]
            }
        }
    ]);
};

// Instance methods
auditLogSchema.methods.addChildEvent = function(childEventId) {
    this.metadata.childEvents.push(childEventId);
    return this.save();
};

auditLogSchema.methods.updateRiskLevel = function(newRiskLevel, reason) {
    this.security.riskLevel = newRiskLevel;
    if (reason) {
        this.security.threatIndicators.push(reason);
    }
    return this.save();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
