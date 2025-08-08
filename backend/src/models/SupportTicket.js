const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    // Ticket Identification
    ticketNumber: {
        type: String,
        unique: true,
        required: true
    },
    
    // User Information
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Ticket Details
    subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        maxlength: 5000
    },
    category: {
        type: String,
        required: true,
        enum: [
            'Technical Support',
            'GST Queries',
            'Payment Issues',
            'Account Management',
            'Feature Request',
            'Bug Report',
            'Billing Support',
            'General Inquiry',
            'Compliance Help',
            'Training Support'
        ]
    },
    subcategory: {
        type: String,
        maxlength: 100
    },
    
    // Priority and Status
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'Urgent', 'Critical'],
        default: 'Medium'
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Pending Customer', 'Resolved', 'Closed', 'Cancelled'],
        default: 'Open'
    },
    
    // Assignment
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAt: Date,
    department: {
        type: String,
        enum: ['Technical', 'GST Expert', 'Billing', 'General Support', 'Management'],
        default: 'General Support'
    },
    
    // Communication
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderType: {
            type: String,
            enum: ['customer', 'agent', 'system'],
            required: true
        },
        message: {
            type: String,
            required: true,
            maxlength: 2000
        },
        messageType: {
            type: String,
            enum: ['text', 'internal_note', 'status_update', 'resolution'],
            default: 'text'
        },
        attachments: [{
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            url: String
        }],
        isInternal: {
            type: Boolean,
            default: false
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        readBy: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            readAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    
    // Attachments
    attachments: [{
        filename: String,
        originalName: String,
        mimeType: String,
        size: Number,
        url: String,
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Resolution
    resolution: {
        summary: String,
        resolvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        resolvedAt: Date,
        resolutionTime: Number, // in minutes
        customerSatisfied: Boolean
    },
    
    // Customer Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        submittedAt: Date
    },
    
    // SLA Tracking
    sla: {
        responseTime: {
            target: Number, // in minutes
            actual: Number,
            met: Boolean
        },
        resolutionTime: {
            target: Number, // in minutes
            actual: Number,
            met: Boolean
        },
        escalationLevel: {
            type: Number,
            default: 0
        },
        escalatedAt: [Date]
    },
    
    // Tags and Labels
    tags: [String],
    labels: [{
        name: String,
        color: String
    }],
    
    // Related Information
    relatedTickets: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportTicket'
    }],
    relatedResources: [{
        type: {
            type: String,
            enum: ['Article', 'Course', 'Webinar', 'FAQ', 'Documentation']
        },
        id: mongoose.Schema.Types.ObjectId,
        title: String,
        url: String
    }],
    
    // Channel Information
    channel: {
        type: String,
        enum: ['Web Portal', 'Email', 'Phone', 'Live Chat', 'Mobile App', 'API'],
        default: 'Web Portal'
    },
    
    // Customer Information
    customerInfo: {
        membershipType: String,
        accountAge: Number, // in days
        previousTickets: Number,
        lastActivity: Date,
        preferredLanguage: {
            type: String,
            default: 'English'
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        }
    },
    
    // Automation
    automation: {
        autoAssigned: {
            type: Boolean,
            default: false
        },
        autoResponded: {
            type: Boolean,
            default: false
        },
        suggestedArticles: [{
            title: String,
            url: String,
            relevanceScore: Number
        }],
        aiSentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative', 'frustrated', 'angry']
        },
        aiCategory: String,
        aiPriority: String
    },
    
    // Metrics
    metrics: {
        firstResponseTime: Number, // in minutes
        totalResponseTime: Number,
        customerResponseTime: Number,
        agentWorkTime: Number,
        reopenCount: {
            type: Number,
            default: 0
        },
        escalationCount: {
            type: Number,
            default: 0
        }
    },
    
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastActivityAt: {
        type: Date,
        default: Date.now
    },
    closedAt: Date,
    
    // Soft delete
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes
supportTicketSchema.index({ ticketNumber: 1 });
supportTicketSchema.index({ user: 1, status: 1 });
supportTicketSchema.index({ assignedTo: 1, status: 1 });
supportTicketSchema.index({ category: 1, priority: 1 });
supportTicketSchema.index({ status: 1, priority: 1, createdAt: -1 });
supportTicketSchema.index({ department: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ lastActivityAt: -1 });
supportTicketSchema.index({ 'sla.responseTime.met': 1 });
supportTicketSchema.index({ 'sla.resolutionTime.met': 1 });

// Text search index
supportTicketSchema.index({
    subject: 'text',
    description: 'text',
    'messages.message': 'text'
});

// Pre-save middleware
supportTicketSchema.pre('save', function(next) {
    // Generate ticket number if not exists
    if (!this.ticketNumber) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        this.ticketNumber = `GST-${timestamp}-${random}`.toUpperCase();
    }
    
    // Update lastActivityAt
    this.lastActivityAt = new Date();
    
    // Calculate resolution time
    if (this.isModified('status') && this.status === 'Resolved' && !this.resolution.resolvedAt) {
        this.resolution.resolvedAt = new Date();
        this.resolution.resolutionTime = Math.round((this.resolution.resolvedAt - this.createdAt) / (1000 * 60));
    }
    
    // Set closed date
    if (this.isModified('status') && this.status === 'Closed' && !this.closedAt) {
        this.closedAt = new Date();
    }
    
    next();
});

// Virtual for age in hours
supportTicketSchema.virtual('ageInHours').get(function() {
    return Math.round((new Date() - this.createdAt) / (1000 * 60 * 60));
});

// Virtual for unread messages count
supportTicketSchema.virtual('unreadMessagesCount').get(function() {
    if (!this.messages) return 0;
    return this.messages.filter(msg => 
        msg.senderType !== 'customer' && 
        !msg.readBy.some(read => read.user.toString() === this.user.toString())
    ).length;
});

// Instance methods
supportTicketSchema.methods.addMessage = function(senderId, senderType, message, options = {}) {
    const newMessage = {
        sender: senderId,
        senderType,
        message,
        messageType: options.messageType || 'text',
        attachments: options.attachments || [],
        isInternal: options.isInternal || false
    };
    
    this.messages.push(newMessage);
    this.lastActivityAt = new Date();
    
    // Update first response time if this is the first agent response
    if (senderType === 'agent' && !this.metrics.firstResponseTime) {
        this.metrics.firstResponseTime = Math.round((new Date() - this.createdAt) / (1000 * 60));
    }
    
    return this.save();
};

supportTicketSchema.methods.assignTo = function(agentId, department) {
    this.assignedTo = agentId;
    this.assignedAt = new Date();
    if (department) this.department = department;
    this.status = 'In Progress';
    
    return this.save();
};

supportTicketSchema.methods.escalate = function(reason) {
    this.sla.escalationLevel += 1;
    this.sla.escalatedAt.push(new Date());
    this.metrics.escalationCount += 1;
    this.priority = this.priority === 'Critical' ? 'Critical' : 
                   this.priority === 'Urgent' ? 'Critical' :
                   this.priority === 'High' ? 'Urgent' : 'High';
    
    // Add escalation message
    this.messages.push({
        sender: null,
        senderType: 'system',
        message: `Ticket escalated: ${reason}`,
        messageType: 'status_update',
        isInternal: true
    });
    
    return this.save();
};

supportTicketSchema.methods.resolve = function(agentId, summary) {
    this.status = 'Resolved';
    this.resolution.summary = summary;
    this.resolution.resolvedBy = agentId;
    this.resolution.resolvedAt = new Date();
    this.resolution.resolutionTime = Math.round((this.resolution.resolvedAt - this.createdAt) / (1000 * 60));
    
    return this.save();
};

supportTicketSchema.methods.addFeedback = function(rating, comment) {
    this.feedback.rating = rating;
    this.feedback.comment = comment;
    this.feedback.submittedAt = new Date();
    this.resolution.customerSatisfied = rating >= 4;
    
    return this.save();
};

supportTicketSchema.methods.reopen = function(reason) {
    this.status = 'Open';
    this.metrics.reopenCount += 1;
    this.resolution = {};
    this.closedAt = null;
    
    // Add reopen message
    this.messages.push({
        sender: this.user,
        senderType: 'customer',
        message: `Ticket reopened: ${reason}`,
        messageType: 'status_update'
    });
    
    return this.save();
};

// Static methods
supportTicketSchema.statics.getTicketStats = function(filters = {}) {
    const matchStage = { isDeleted: false, ...filters };
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                total: { $sum: 1 },
                open: { $sum: { $cond: [{ $eq: ['$status', 'Open'] }, 1, 0] } },
                inProgress: { $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] } },
                resolved: { $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] } },
                closed: { $sum: { $cond: [{ $eq: ['$status', 'Closed'] }, 1, 0] } },
                avgResolutionTime: { $avg: '$resolution.resolutionTime' },
                avgRating: { $avg: '$feedback.rating' }
            }
        }
    ]);
};

supportTicketSchema.statics.getAgentWorkload = function(agentId) {
    return this.aggregate([
        {
            $match: {
                assignedTo: agentId,
                status: { $in: ['Open', 'In Progress', 'Pending Customer'] },
                isDeleted: false
            }
        },
        {
            $group: {
                _id: '$priority',
                count: { $sum: 1 }
            }
        }
    ]);
};

supportTicketSchema.statics.getSLAReport = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                createdAt: { $gte: startDate, $lte: endDate },
                isDeleted: false
            }
        },
        {
            $group: {
                _id: null,
                totalTickets: { $sum: 1 },
                responseTimeMet: { $sum: { $cond: ['$sla.responseTime.met', 1, 0] } },
                resolutionTimeMet: { $sum: { $cond: ['$sla.resolutionTime.met', 1, 0] } },
                avgResponseTime: { $avg: '$sla.responseTime.actual' },
                avgResolutionTime: { $avg: '$sla.resolutionTime.actual' }
            }
        }
    ]);
};

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = SupportTicket;
