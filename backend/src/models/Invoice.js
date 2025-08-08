const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    subscription: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subscription'
    },
    type: {
        type: String,
        enum: ['subscription', 'one_time', 'refund', 'adjustment'],
        default: 'subscription'
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'refunded'],
        default: 'draft'
    },
    issueDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    paidDate: Date,
    items: [{
        description: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 0
        },
        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },
        totalPrice: {
            type: Number,
            required: true,
            min: 0
        },
        taxRate: {
            type: Number,
            default: 18, // GST rate in India
            min: 0,
            max: 100
        },
        taxAmount: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    subtotal: {
        type: Number,
        required: true,
        min: 0
    },
    taxTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    discountTotal: {
        type: Number,
        default: 0,
        min: 0
    },
    total: {
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
        enum: ['stripe', 'razorpay', 'bank_transfer', 'upi', 'wallet', 'cash']
    },
    paymentDetails: {
        transactionId: String,
        paymentMethodId: String,
        gatewayResponse: Object
    },
    billingAddress: {
        name: String,
        email: String,
        phone: String,
        address: {
            line1: String,
            line2: String,
            city: String,
            state: String,
            postalCode: String,
            country: {
                type: String,
                default: 'India'
            }
        },
        gstNumber: String
    },
    notes: String,
    internalNotes: String,
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        mimeType: String
    }],
    emailSent: {
        type: Boolean,
        default: false
    },
    emailSentAt: Date,
    remindersSent: {
        type: Number,
        default: 0
    },
    lastReminderSent: Date
}, {
    timestamps: true
});

// Index for efficient queries
invoiceSchema.index({ user: 1, status: 1 });
invoiceSchema.index({ dueDate: 1, status: 1 });
invoiceSchema.index({ invoiceNumber: 1 });

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
    return this.status === 'sent' && this.dueDate < new Date();
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
    if (!this.isOverdue) return 0;
    const diffTime = new Date() - this.dueDate;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware to generate invoice number
invoiceSchema.pre('save', async function(next) {
    if (this.isNew && !this.invoiceNumber) {
        const year = new Date().getFullYear();
        const month = String(new Date().getMonth() + 1).padStart(2, '0');
        
        // Find the last invoice for this month
        const lastInvoice = await this.constructor.findOne({
            invoiceNumber: new RegExp(`^GST-${year}${month}-`)
        }).sort({ invoiceNumber: -1 });
        
        let sequence = 1;
        if (lastInvoice) {
            const lastSequence = parseInt(lastInvoice.invoiceNumber.split('-')[2]);
            sequence = lastSequence + 1;
        }
        
        this.invoiceNumber = `GST-${year}${month}-${String(sequence).padStart(4, '0')}`;
    }
    next();
});

// Method to mark as paid
invoiceSchema.methods.markAsPaid = function(paymentDetails = {}) {
    this.status = 'paid';
    this.paidDate = new Date();
    this.paymentDetails = { ...this.paymentDetails, ...paymentDetails };
    return this.save();
};

// Method to send reminder
invoiceSchema.methods.sendReminder = function() {
    this.remindersSent += 1;
    this.lastReminderSent = new Date();
    return this.save();
};

// Static method to find overdue invoices
invoiceSchema.statics.findOverdue = function() {
    return this.find({
        status: 'sent',
        dueDate: { $lt: new Date() }
    }).populate('user');
};

// Static method to calculate total revenue
invoiceSchema.statics.calculateRevenue = function(startDate, endDate) {
    return this.aggregate([
        {
            $match: {
                status: 'paid',
                paidDate: {
                    $gte: startDate,
                    $lte: endDate
                }
            }
        },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: '$total' },
                totalInvoices: { $sum: 1 }
            }
        }
    ]);
};

const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = Invoice;
