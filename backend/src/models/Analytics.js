const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Business Profile Analytics
    businessProfile: {
        gstinCount: {
            type: Number,
            default: 0
        },
        businessType: {
            type: String,
            enum: ['proprietorship', 'partnership', 'company', 'llp', 'trust', 'society', 'other']
        },
        annualTurnover: {
            type: Number,
            default: 0
        },
        industryType: String,
        stateOfOperation: [String],
        complianceRating: {
            type: String,
            enum: ['excellent', 'good', 'average', 'poor', 'critical'],
            default: 'average'
        }
    },
    
    // GST Filing Analytics
    gstFilingStats: {
        totalReturns: {
            type: Number,
            default: 0
        },
        filedOnTime: {
            type: Number,
            default: 0
        },
        lateFilings: {
            type: Number,
            default: 0
        },
        pendingReturns: {
            type: Number,
            default: 0
        },
        averageFilingTime: {
            type: Number, // in days before due date
            default: 0
        },
        returnTypes: {
            gstr1: { filed: { type: Number, default: 0 }, pending: { type: Number, default: 0 } },
            gstr3b: { filed: { type: Number, default: 0 }, pending: { type: Number, default: 0 } },
            gstr2: { filed: { type: Number, default: 0 }, pending: { type: Number, default: 0 } },
            gstr9: { filed: { type: Number, default: 0 }, pending: { type: Number, default: 0 } }
        },
        monthlyTrend: [{
            month: Number,
            year: Number,
            filed: Number,
            onTime: Number,
            late: Number
        }]
    },
    
    // Tax Liability Analytics
    taxLiability: {
        currentMonth: {
            igst: { type: Number, default: 0 },
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            cess: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        previousMonth: {
            igst: { type: Number, default: 0 },
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            cess: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        yearToDate: {
            igst: { type: Number, default: 0 },
            cgst: { type: Number, default: 0 },
            sgst: { type: Number, default: 0 },
            cess: { type: Number, default: 0 },
            total: { type: Number, default: 0 }
        },
        monthlyTrend: [{
            month: Number,
            year: Number,
            igst: Number,
            cgst: Number,
            sgst: Number,
            cess: Number,
            total: Number,
            paid: Number,
            outstanding: Number
        }],
        projectedLiability: {
            nextMonth: { type: Number, default: 0 },
            nextQuarter: { type: Number, default: 0 },
            nextYear: { type: Number, default: 0 }
        }
    },
    
    // Input Tax Credit Analytics
    itcAnalytics: {
        totalITCAvailable: {
            type: Number,
            default: 0
        },
        itcUtilized: {
            type: Number,
            default: 0
        },
        itcLapsed: {
            type: Number,
            default: 0
        },
        itcCarryForward: {
            type: Number,
            default: 0
        },
        utilizationRate: {
            type: Number,
            default: 0
        },
        monthlyITCTrend: [{
            month: Number,
            year: Number,
            available: Number,
            utilized: Number,
            lapsed: Number
        }]
    },
    
    // E-Way Bill Analytics
    eWayBillStats: {
        totalGenerated: {
            type: Number,
            default: 0
        },
        activeEWayBills: {
            type: Number,
            default: 0
        },
        expiredEWayBills: {
            type: Number,
            default: 0
        },
        cancelledEWayBills: {
            type: Number,
            default: 0
        },
        averageDistance: {
            type: Number,
            default: 0
        },
        totalValue: {
            type: Number,
            default: 0
        },
        monthlyTrend: [{
            month: Number,
            year: Number,
            generated: Number,
            value: Number,
            averageValue: Number
        }]
    },
    
    // Compliance Score Breakdown
    complianceScore: {
        overall: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        breakdown: {
            filingCompliance: {
                score: { type: Number, default: 0 },
                weight: { type: Number, default: 40 }
            },
            paymentCompliance: {
                score: { type: Number, default: 0 },
                weight: { type: Number, default: 30 }
            },
            documentCompliance: {
                score: { type: Number, default: 0 },
                weight: { type: Number, default: 20 }
            },
            generalCompliance: {
                score: { type: Number, default: 0 },
                weight: { type: Number, default: 10 }
            }
        },
        history: [{
            date: { type: Date, default: Date.now },
            score: Number,
            factors: [{
                factor: String,
                impact: Number,
                description: String
            }]
        }],
        recommendations: [{
            priority: {
                type: String,
                enum: ['high', 'medium', 'low']
            },
            category: String,
            title: String,
            description: String,
            actionRequired: String,
            potentialImpact: Number,
            deadline: Date,
            isCompleted: {
                type: Boolean,
                default: false
            }
        }]
    },
    
    // Platform Usage Analytics
    platformUsage: {
        loginFrequency: {
            type: Number,
            default: 0
        },
        featuresUsed: [{
            feature: String,
            usageCount: Number,
            lastUsed: Date
        }],
        timeSpentOnPlatform: {
            type: Number, // in minutes
            default: 0
        },
        documentsUploaded: {
            type: Number,
            default: 0
        },
        calculationsPerformed: {
            type: Number,
            default: 0
        },
        coursesCompleted: {
            type: Number,
            default: 0
        },
        webinarsAttended: {
            type: Number,
            default: 0
        }
    },
    
    // Financial Analytics
    financialMetrics: {
        subscriptionValue: {
            type: Number,
            default: 0
        },
        totalSpent: {
            type: Number,
            default: 0
        },
        savingsFromPlatform: {
            type: Number,
            default: 0
        },
        roi: {
            type: Number,
            default: 0
        }
    },
    
    // Alerts and Notifications
    alerts: [{
        type: {
            type: String,
            enum: ['compliance', 'payment', 'filing', 'general']
        },
        severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical']
        },
        title: String,
        message: String,
        isRead: {
            type: Boolean,
            default: false
        },
        isResolved: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        resolvedAt: Date,
        actionUrl: String
    }],
    
    // Last Updated Timestamps
    lastCalculated: {
        type: Date,
        default: Date.now
    },
    calculationFrequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly'],
        default: 'daily'
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
analyticsSchema.index({ user: 1 });
analyticsSchema.index({ 'complianceScore.overall': -1 });
analyticsSchema.index({ lastCalculated: 1 });
analyticsSchema.index({ 'alerts.isRead': 1, 'alerts.severity': 1 });

// Virtual for compliance grade
analyticsSchema.virtual('complianceGrade').get(function() {
    const score = this.complianceScore.overall;
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
});

// Method to calculate overall compliance score
analyticsSchema.methods.calculateComplianceScore = function() {
    const breakdown = this.complianceScore.breakdown;
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.values(breakdown).forEach(component => {
        totalScore += component.score * component.weight;
        totalWeight += component.weight;
    });
    
    this.complianceScore.overall = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    return this.complianceScore.overall;
};

// Method to add alert
analyticsSchema.methods.addAlert = function(alertData) {
    this.alerts.unshift({
        ...alertData,
        createdAt: new Date()
    });
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
        this.alerts = this.alerts.slice(0, 50);
    }
    
    return this.save();
};

// Method to mark alert as read
analyticsSchema.methods.markAlertAsRead = function(alertId) {
    const alert = this.alerts.id(alertId);
    if (alert) {
        alert.isRead = true;
        return this.save();
    }
    return Promise.resolve(this);
};

// Static method to get user analytics summary
analyticsSchema.statics.getUserSummary = function(userId) {
    return this.findOne({ user: userId })
        .populate('user', 'name email membership')
        .select('complianceScore gstFilingStats taxLiability platformUsage alerts');
};

// Static method to get compliance leaderboard
analyticsSchema.statics.getComplianceLeaderboard = function(limit = 10) {
    return this.find()
        .populate('user', 'name profile.avatar')
        .sort({ 'complianceScore.overall': -1 })
        .limit(limit)
        .select('user complianceScore.overall businessProfile.businessType');
};

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
