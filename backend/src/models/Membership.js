const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        enum: ['free', 'basic', 'premium', 'elite']
    },
    displayName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    price: {
        monthly: {
            type: Number,
            required: true,
            min: 0
        },
        yearly: {
            type: Number,
            required: true,
            min: 0
        }
    },
    features: [{
        name: {
            type: String,
            required: true
        },
        description: String,
        included: {
            type: Boolean,
            default: true
        },
        limit: {
            type: Number,
            default: -1 // -1 means unlimited
        }
    }],
    benefits: [String],
    limitations: [String],
    isActive: {
        type: Boolean,
        default: true
    },
    sortOrder: {
        type: Number,
        default: 0
    },
    stripePriceIds: {
        monthly: String,
        yearly: String
    },
    razorpayPlanIds: {
        monthly: String,
        yearly: String
    }
}, {
    timestamps: true
});

// Virtual for monthly discount percentage
membershipSchema.virtual('yearlyDiscount').get(function() {
    if (this.price.monthly === 0) return 0;
    const monthlyTotal = this.price.monthly * 12;
    return Math.round(((monthlyTotal - this.price.yearly) / monthlyTotal) * 100);
});

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
