const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    membership: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Membership',
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'cancelled', 'expired', 'pending', 'failed'],
        default: 'pending'
    },
    billingCycle: {
        type: String,
        enum: ['monthly', 'yearly'],
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    nextBillingDate: {
        type: Date
    },
    autoRenewal: {
        type: Boolean,
        default: true
    },
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        default: 'INR'
    },
    paymentMethod: {
        type: String,
        enum: ['stripe', 'razorpay', 'bank_transfer', 'upi', 'wallet'],
        required: true
    },
    paymentDetails: {
        paymentMethodId: String,
        customerId: String,
        subscriptionId: String,
        lastPaymentId: String
    },
    discounts: [{
        code: String,
        type: {
            type: String,
            enum: ['percentage', 'fixed']
        },
        value: Number,
        appliedAmount: Number,
        validUntil: Date
    }],
    invoices: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice'
    }],
    cancelledAt: Date,
    cancelReason: String,
    renewalAttempts: {
        type: Number,
        default: 0
    },
    lastRenewalAttempt: Date,
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Index for efficient queries
subscriptionSchema.index({ user: 1, status: 1 });
subscriptionSchema.index({ endDate: 1, status: 1 });
subscriptionSchema.index({ nextBillingDate: 1, autoRenewal: 1 });

// Virtual for days remaining
subscriptionSchema.virtual('daysRemaining').get(function() {
    if (this.status !== 'active') return 0;
    const now = new Date();
    const diffTime = this.endDate - now;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for is expired
subscriptionSchema.virtual('isExpired').get(function() {
    return this.endDate < new Date();
});

// Method to check if subscription is active
subscriptionSchema.methods.isActive = function() {
    return this.status === 'active' && this.endDate > new Date();
};

// Method to cancel subscription
subscriptionSchema.methods.cancel = function(reason = 'User requested') {
    this.status = 'cancelled';
    this.cancelledAt = new Date();
    this.cancelReason = reason;
    this.autoRenewal = false;
    return this.save();
};

// Method to renew subscription
subscriptionSchema.methods.renew = function(duration = 30) {
    const now = new Date();
    this.startDate = now;
    this.endDate = new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);
    this.nextBillingDate = this.billingCycle === 'monthly' 
        ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    this.status = 'active';
    this.renewalAttempts = 0;
    return this.save();
};

// Static method to find expiring subscriptions
subscriptionSchema.statics.findExpiring = function(days = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.find({
        status: 'active',
        endDate: { $lte: futureDate, $gte: new Date() },
        autoRenewal: true
    }).populate('user membership');
};

// Static method to find expired subscriptions
subscriptionSchema.statics.findExpired = function() {
    return this.find({
        status: 'active',
        endDate: { $lt: new Date() }
    }).populate('user membership');
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;
