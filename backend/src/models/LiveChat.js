const mongoose = require('mongoose');

const liveChatSchema = new mongoose.Schema({
    // Session Identification
    sessionId: {
        type: String,
        unique: true,
        required: true
    },
    
    // Participants
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Session Details
    status: {
        type: String,
        enum: ['waiting', 'active', 'ended', 'transferred', 'abandoned'],
        default: 'waiting'
    },
    
    // Queue Information
    queuePosition: {
        type: Number,
        default: 0
    },
    department: {
        type: String,
        enum: ['General Support', 'Technical', 'GST Expert', 'Billing', 'Sales'],
        default: 'General Support'
    },
    priority: {
        type: String,
        enum: ['Low', 'Medium', 'High', 'VIP'],
        default: 'Medium'
    },
    
    // Messages
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderType: {
            type: String,
            enum: ['customer', 'agent', 'system', 'bot'],
            required: true
        },
        message: {
            type: String,
            required: true,
            maxlength: 1000
        },
        messageType: {
            type: String,
            enum: ['text', 'image', 'file', 'system_message', 'quick_reply', 'typing_indicator'],
            default: 'text'
        },
        attachments: [{
            filename: String,
            originalName: String,
            mimeType: String,
            size: Number,
            url: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        },
        delivered: {
            type: Boolean,
            default: false
        },
        read: {
            type: Boolean,
            default: false
        },
        readAt: Date
    }],
    
    // Customer Information
    customerInfo: {
        name: String,
        email: String,
        phone: String,
        membershipType: String,
        previousChats: Number,
        currentPage: String,
        userAgent: String,
        ipAddress: String,
        location: {
            country: String,
            region: String,
            city: String
        }
    },
    
    // Pre-chat Form Data
    preChatData: {
        name: String,
        email: String,
        phone: String,
        subject: String,
        message: String,
        department: String,
        urgency: String
    },
    
    // Session Metrics
    metrics: {
        waitTime: Number, // in seconds
        responseTime: Number, // average response time in seconds
        sessionDuration: Number, // in seconds
        messageCount: {
            customer: { type: Number, default: 0 },
            agent: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        transferCount: { type: Number, default: 0 },
        escalationCount: { type: Number, default: 0 }
    },
    
    // Agent Performance
    agentMetrics: {
        firstResponseTime: Number, // in seconds
        averageResponseTime: Number,
        totalResponseTime: Number,
        messagesHandled: Number
    },
    
    // Chat Features
    features: {
        fileUploadEnabled: { type: Boolean, default: true },
        screenSharingEnabled: { type: Boolean, default: false },
        voiceCallEnabled: { type: Boolean, default: false },
        videoCallEnabled: { type: Boolean, default: false },
        cobrowsingEnabled: { type: Boolean, default: false }
    },
    
    // Bot Integration
    botInteraction: {
        botUsed: { type: Boolean, default: false },
        botMessages: Number,
        botResolved: { type: Boolean, default: false },
        handoffReason: String,
        botSatisfaction: Number // 1-5 rating
    },
    
    // Feedback
    feedback: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        comment: String,
        categories: [String], // helpful, knowledgeable, quick, etc.
        submittedAt: Date,
        npsScore: Number // Net Promoter Score
    },
    
    // Session Events
    events: [{
        type: {
            type: String,
            enum: [
                'session_started', 'agent_joined', 'agent_left', 'customer_left',
                'message_sent', 'file_uploaded', 'session_transferred', 'session_escalated',
                'typing_started', 'typing_stopped', 'session_ended', 'feedback_submitted'
            ]
        },
        timestamp: { type: Date, default: Date.now },
        data: mongoose.Schema.Types.Mixed,
        triggeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    
    // Tags and Categories
    tags: [String],
    category: String,
    subcategory: String,
    
    // Resolution
    resolution: {
        resolved: { type: Boolean, default: false },
        resolutionType: {
            type: String,
            enum: ['answered', 'escalated_to_ticket', 'transferred', 'abandoned', 'technical_issue']
        },
        summary: String,
        followUpRequired: { type: Boolean, default: false },
        ticketCreated: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SupportTicket'
        }
    },
    
    // Timestamps
    startedAt: {
        type: Date,
        default: Date.now
    },
    agentJoinedAt: Date,
    endedAt: Date,
    lastActivityAt: {
        type: Date,
        default: Date.now
    },
    
    // Auto-close settings
    autoCloseAfter: {
        type: Number,
        default: 1800 // 30 minutes of inactivity
    },
    
    // Privacy and Compliance
    dataRetention: {
        retainUntil: Date,
        anonymized: { type: Boolean, default: false },
        anonymizedAt: Date
    },
    
    // Integration Data
    integrationData: {
        source: String, // website, mobile_app, api
        referrer: String,
        campaignId: String,
        sessionData: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
liveChatSchema.index({ sessionId: 1 });
liveChatSchema.index({ customer: 1, status: 1 });
liveChatSchema.index({ agent: 1, status: 1 });
liveChatSchema.index({ status: 1, department: 1 });
liveChatSchema.index({ startedAt: -1 });
liveChatSchema.index({ lastActivityAt: -1 });
liveChatSchema.index({ queuePosition: 1, priority: -1 });

// Pre-save middleware
liveChatSchema.pre('save', function(next) {
    // Generate session ID if not exists
    if (!this.sessionId) {
        this.sessionId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Update last activity
    this.lastActivityAt = new Date();
    
    // Calculate session duration if ended
    if (this.isModified('status') && this.status === 'ended' && !this.endedAt) {
        this.endedAt = new Date();
        this.metrics.sessionDuration = Math.round((this.endedAt - this.startedAt) / 1000);
    }
    
    // Update message counts
    if (this.isModified('messages')) {
        this.metrics.messageCount.customer = this.messages.filter(m => m.senderType === 'customer').length;
        this.metrics.messageCount.agent = this.messages.filter(m => m.senderType === 'agent').length;
        this.metrics.messageCount.total = this.messages.length;
    }
    
    next();
});

// Virtual for session age
liveChatSchema.virtual('sessionAge').get(function() {
    return Math.round((new Date() - this.startedAt) / 1000);
});

// Virtual for unread messages
liveChatSchema.virtual('unreadMessages').get(function() {
    return this.messages.filter(msg => !msg.read && msg.senderType !== 'agent').length;
});

// Instance methods
liveChatSchema.methods.addMessage = function(senderId, senderType, message, options = {}) {
    const newMessage = {
        sender: senderId,
        senderType,
        message,
        messageType: options.messageType || 'text',
        attachments: options.attachments || []
    };
    
    this.messages.push(newMessage);
    this.lastActivityAt = new Date();
    
    // Update first response time for agent
    if (senderType === 'agent' && !this.agentMetrics.firstResponseTime) {
        this.agentMetrics.firstResponseTime = Math.round((new Date() - this.startedAt) / 1000);
    }
    
    // Add event
    this.events.push({
        type: 'message_sent',
        triggeredBy: senderId,
        data: { messageType: newMessage.messageType, messageLength: message.length }
    });
    
    return this.save();
};

liveChatSchema.methods.assignAgent = function(agentId) {
    this.agent = agentId;
    this.agentJoinedAt = new Date();
    this.status = 'active';
    this.queuePosition = 0;
    
    // Calculate wait time
    this.metrics.waitTime = Math.round((this.agentJoinedAt - this.startedAt) / 1000);
    
    // Add event
    this.events.push({
        type: 'agent_joined',
        triggeredBy: agentId
    });
    
    // Add system message
    this.messages.push({
        sender: agentId,
        senderType: 'system',
        message: 'Agent has joined the chat',
        messageType: 'system_message'
    });
    
    return this.save();
};

liveChatSchema.methods.transferToAgent = function(newAgentId, reason) {
    const previousAgent = this.agent;
    this.agent = newAgentId;
    this.metrics.transferCount += 1;
    
    // Add event
    this.events.push({
        type: 'session_transferred',
        triggeredBy: previousAgent,
        data: { newAgent: newAgentId, reason }
    });
    
    // Add system message
    this.messages.push({
        sender: newAgentId,
        senderType: 'system',
        message: `Chat transferred to new agent. Reason: ${reason}`,
        messageType: 'system_message'
    });
    
    return this.save();
};

liveChatSchema.methods.endSession = function(endedBy, reason) {
    this.status = 'ended';
    this.endedAt = new Date();
    this.metrics.sessionDuration = Math.round((this.endedAt - this.startedAt) / 1000);
    
    // Set resolution
    this.resolution.resolutionType = reason || 'answered';
    
    // Add event
    this.events.push({
        type: 'session_ended',
        triggeredBy: endedBy,
        data: { reason }
    });
    
    return this.save();
};

liveChatSchema.methods.addFeedback = function(rating, comment, categories = [], npsScore) {
    this.feedback.rating = rating;
    this.feedback.comment = comment;
    this.feedback.categories = categories;
    this.feedback.npsScore = npsScore;
    this.feedback.submittedAt = new Date();
    
    // Add event
    this.events.push({
        type: 'feedback_submitted',
        triggeredBy: this.customer,
        data: { rating, npsScore }
    });
    
    return this.save();
};

liveChatSchema.methods.markMessagesAsRead = function(userId) {
    this.messages.forEach(msg => {
        if (msg.sender.toString() !== userId.toString() && !msg.read) {
            msg.read = true;
            msg.readAt = new Date();
        }
    });
    
    return this.save();
};

liveChatSchema.methods.escalateToTicket = function(ticketData) {
    this.resolution.resolutionType = 'escalated_to_ticket';
    this.resolution.followUpRequired = true;
    
    // The ticket creation would be handled by the service layer
    // This method just marks the chat as escalated
    
    return this.save();
};

// Static methods
liveChatSchema.statics.getQueueStats = function(department) {
    const matchStage = { 
        status: 'waiting',
        ...(department && { department })
    };
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$department',
                totalWaiting: { $sum: 1 },
                avgWaitTime: { $avg: '$metrics.waitTime' },
                longestWait: { $max: '$sessionAge' }
            }
        }
    ]);
};

liveChatSchema.statics.getAgentStats = function(agentId, startDate, endDate) {
    const matchStage = {
        agent: agentId,
        startedAt: { $gte: startDate, $lte: endDate }
    };
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: null,
                totalChats: { $sum: 1 },
                avgSessionDuration: { $avg: '$metrics.sessionDuration' },
                avgResponseTime: { $avg: '$agentMetrics.averageResponseTime' },
                avgRating: { $avg: '$feedback.rating' },
                totalMessages: { $sum: '$metrics.messageCount.agent' }
            }
        }
    ]);
};

liveChatSchema.statics.getDepartmentStats = function(startDate, endDate) {
    const matchStage = {
        startedAt: { $gte: startDate, $lte: endDate }
    };
    
    return this.aggregate([
        { $match: matchStage },
        {
            $group: {
                _id: '$department',
                totalChats: { $sum: 1 },
                avgWaitTime: { $avg: '$metrics.waitTime' },
                avgSessionDuration: { $avg: '$metrics.sessionDuration' },
                avgRating: { $avg: '$feedback.rating' },
                resolvedChats: { $sum: { $cond: ['$resolution.resolved', 1, 0] } }
            }
        }
    ]);
};

liveChatSchema.statics.getNextInQueue = function(department, agentSkills = []) {
    const matchStage = {
        status: 'waiting',
        department: department
    };
    
    return this.findOne(matchStage)
        .sort({ priority: -1, queuePosition: 1, startedAt: 1 })
        .populate('customer', 'name email profile.avatar');
};

liveChatSchema.statics.updateQueuePositions = function(department) {
    return this.find({ status: 'waiting', department })
        .sort({ priority: -1, startedAt: 1 })
        .then(chats => {
            const updates = chats.map((chat, index) => ({
                updateOne: {
                    filter: { _id: chat._id },
                    update: { queuePosition: index + 1 }
                }
            }));
            
            return this.bulkWrite(updates);
        });
};

const LiveChat = mongoose.model('LiveChat', liveChatSchema);

module.exports = LiveChat;
