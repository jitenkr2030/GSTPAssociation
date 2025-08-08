const mongoose = require('mongoose');

const eWayBillSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    ewbNo: {
        type: String,
        unique: true,
        sparse: true // Allows multiple null values
    },
    status: {
        type: String,
        enum: ['draft', 'generated', 'cancelled', 'expired'],
        default: 'draft'
    },
    
    // Transaction Details
    transactionType: {
        type: String,
        enum: ['Regular', 'Bill To - Ship To', 'Bill From - Dispatch From', 'Combination of 2 and 3'],
        required: true
    },
    subType: {
        type: String,
        enum: ['Supply', 'Import', 'Export', 'Job Work', 'For Own Use', 'Sales Return', 'Others'],
        required: true
    },
    docType: {
        type: String,
        enum: ['Tax Invoice', 'Bill of Supply', 'Delivery Challan', 'Credit Note', 'Debit Note', 'Others'],
        required: true
    },
    docNo: {
        type: String,
        required: true
    },
    docDate: {
        type: Date,
        required: true
    },
    
    // Supplier Details
    fromGstin: {
        type: String,
        required: true,
        match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    },
    fromTrdName: {
        type: String,
        required: true
    },
    fromAddr1: {
        type: String,
        required: true
    },
    fromAddr2: String,
    fromPlace: {
        type: String,
        required: true
    },
    fromPincode: {
        type: String,
        required: true,
        match: /^[0-9]{6}$/
    },
    fromStateCode: {
        type: String,
        required: true,
        match: /^[0-9]{2}$/
    },
    
    // Recipient Details
    toGstin: {
        type: String,
        match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    },
    toTrdName: {
        type: String,
        required: true
    },
    toAddr1: {
        type: String,
        required: true
    },
    toAddr2: String,
    toPlace: {
        type: String,
        required: true
    },
    toPincode: {
        type: String,
        required: true,
        match: /^[0-9]{6}$/
    },
    toStateCode: {
        type: String,
        required: true,
        match: /^[0-9]{2}$/
    },
    
    // Dispatch Details (if different from supplier)
    dispatchFromGstin: String,
    dispatchFromTrdName: String,
    dispatchFromAddr1: String,
    dispatchFromAddr2: String,
    dispatchFromPlace: String,
    dispatchFromPincode: String,
    dispatchFromStateCode: String,
    
    // Ship To Details (if different from recipient)
    shipToGstin: String,
    shipToTrdName: String,
    shipToAddr1: String,
    shipToAddr2: String,
    shipToPlace: String,
    shipToPincode: String,
    shipToStateCode: String,
    
    // Item Details
    itemList: [{
        productName: {
            type: String,
            required: true
        },
        productDesc: String,
        hsnCode: {
            type: String,
            required: true,
            match: /^[0-9]{4,8}$/
        },
        quantity: {
            type: Number,
            required: true,
            min: 0
        },
        qtyUnit: {
            type: String,
            required: true
        },
        taxableAmount: {
            type: Number,
            required: true,
            min: 0
        },
        sgstRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        cgstRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        igstRate: {
            type: Number,
            default: 0,
            min: 0,
            max: 100
        },
        cessRate: {
            type: Number,
            default: 0,
            min: 0
        },
        cessAdvol: {
            type: Number,
            default: 0,
            min: 0
        }
    }],
    
    // Transportation Details
    transporterId: String,
    transporterName: String,
    transMode: {
        type: String,
        enum: ['Road', 'Rail', 'Air', 'Ship'],
        required: true
    },
    transDistance: {
        type: Number,
        required: true,
        min: 0
    },
    transDocNo: String,
    transDocDate: Date,
    vehicleNo: String,
    vehicleType: {
        type: String,
        enum: ['Regular', 'Over Dimensional Cargo (ODC)']
    },
    
    // Totals
    totalValue: {
        type: Number,
        required: true,
        min: 0
    },
    cgstValue: {
        type: Number,
        default: 0,
        min: 0
    },
    sgstValue: {
        type: Number,
        default: 0,
        min: 0
    },
    igstValue: {
        type: Number,
        default: 0,
        min: 0
    },
    cessValue: {
        type: Number,
        default: 0,
        min: 0
    },
    cessNonAdvolValue: {
        type: Number,
        default: 0,
        min: 0
    },
    otherValue: {
        type: Number,
        default: 0,
        min: 0
    },
    totalInvoiceValue: {
        type: Number,
        required: true,
        min: 0
    },
    
    // E-Way Bill Specific
    validUpto: Date,
    generatedDate: Date,
    cancelledDate: Date,
    cancelReason: String,
    
    // Additional Info
    mainHsnCode: String,
    supplyType: {
        type: String,
        enum: ['Inward', 'Outward']
    },
    
    // Tracking
    currentLocation: String,
    trackingHistory: [{
        location: String,
        timestamp: { type: Date, default: Date.now },
        status: String,
        remarks: String
    }],
    
    // Validation and Errors
    validationErrors: [{
        field: String,
        message: String,
        severity: { type: String, enum: ['error', 'warning', 'info'] }
    }],
    
    // API Response Data
    apiResponse: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    }
}, {
    timestamps: true
});

// Indexes
eWayBillSchema.index({ user: 1, status: 1 });
eWayBillSchema.index({ ewbNo: 1 });
eWayBillSchema.index({ fromGstin: 1, docDate: -1 });
eWayBillSchema.index({ validUpto: 1, status: 1 });

// Virtual for expiry status
eWayBillSchema.virtual('isExpired').get(function() {
    return this.validUpto && this.validUpto < new Date();
});

// Virtual for days until expiry
eWayBillSchema.virtual('daysUntilExpiry').get(function() {
    if (!this.validUpto) return null;
    const diffTime = this.validUpto - new Date();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Method to calculate totals
eWayBillSchema.methods.calculateTotals = function() {
    let totalValue = 0;
    let cgstValue = 0;
    let sgstValue = 0;
    let igstValue = 0;
    let cessValue = 0;
    let cessNonAdvolValue = 0;
    
    this.itemList.forEach(item => {
        totalValue += item.taxableAmount;
        cgstValue += (item.taxableAmount * item.cgstRate) / 100;
        sgstValue += (item.taxableAmount * item.sgstRate) / 100;
        igstValue += (item.taxableAmount * item.igstRate) / 100;
        cessValue += (item.taxableAmount * item.cessRate) / 100;
        cessNonAdvolValue += item.cessAdvol * item.quantity;
    });
    
    this.totalValue = totalValue;
    this.cgstValue = cgstValue;
    this.sgstValue = sgstValue;
    this.igstValue = igstValue;
    this.cessValue = cessValue;
    this.cessNonAdvolValue = cessNonAdvolValue;
    this.totalInvoiceValue = totalValue + cgstValue + sgstValue + igstValue + cessValue + cessNonAdvolValue + this.otherValue;
    
    return {
        totalValue,
        cgstValue,
        sgstValue,
        igstValue,
        cessValue,
        cessNonAdvolValue,
        totalInvoiceValue: this.totalInvoiceValue
    };
};

// Method to validate e-way bill data
eWayBillSchema.methods.validateEWayBillData = function() {
    const errors = [];
    
    // Basic validations
    if (!this.fromGstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
        errors.push({ field: 'fromGstin', message: 'Invalid supplier GSTIN format', severity: 'error' });
    }
    
    if (this.toGstin && !this.toGstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
        errors.push({ field: 'toGstin', message: 'Invalid recipient GSTIN format', severity: 'error' });
    }
    
    if (this.totalInvoiceValue < 50000 && this.transDistance < 10) {
        errors.push({ field: 'totalInvoiceValue', message: 'E-Way Bill not required for consignments below ₹50,000 and distance less than 10 km', severity: 'warning' });
    }
    
    // Item validations
    if (!this.itemList || this.itemList.length === 0) {
        errors.push({ field: 'itemList', message: 'At least one item is required', severity: 'error' });
    }
    
    this.itemList.forEach((item, index) => {
        if (!item.hsnCode.match(/^[0-9]{4,8}$/)) {
            errors.push({ field: `itemList[${index}].hsnCode`, message: 'Invalid HSN code format', severity: 'error' });
        }
        
        if (item.quantity <= 0) {
            errors.push({ field: `itemList[${index}].quantity`, message: 'Quantity must be greater than 0', severity: 'error' });
        }
    });
    
    this.validationErrors = errors;
    return errors;
};

// Static method to find expiring e-way bills
eWayBillSchema.statics.findExpiringEWayBills = function(days = 1) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);
    
    return this.find({
        status: 'generated',
        validUpto: { $lte: futureDate, $gte: new Date() }
    }).populate('user');
};

const EWayBill = mongoose.model('EWayBill', eWayBillSchema);

module.exports = EWayBill;
