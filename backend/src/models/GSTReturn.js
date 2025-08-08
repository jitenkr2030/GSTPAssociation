const mongoose = require('mongoose');

const gstReturnSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    gstin: {
        type: String,
        required: true,
        match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    },
    returnType: {
        type: String,
        enum: ['GSTR1', 'GSTR2', 'GSTR3B', 'GSTR4', 'GSTR5', 'GSTR6', 'GSTR7', 'GSTR8', 'GSTR9', 'GSTR9C'],
        required: true
    },
    period: {
        month: {
            type: Number,
            required: true,
            min: 1,
            max: 12
        },
        year: {
            type: Number,
            required: true,
            min: 2017
        }
    },
    status: {
        type: String,
        enum: ['draft', 'filed', 'processed', 'rejected', 'amended'],
        default: 'draft'
    },
    filingDate: Date,
    dueDate: {
        type: Date,
        required: true
    },
    acknowledgmentNumber: String,
    
    // GSTR-1 specific fields
    gstr1Data: {
        b2b: [{
            ctin: String,
            invoices: [{
                inum: String,
                idt: Date,
                val: Number,
                pos: String,
                rchrg: String,
                inv_typ: String,
                items: [{
                    num: Number,
                    itm_det: {
                        rt: Number,
                        txval: Number,
                        iamt: Number,
                        camt: Number,
                        samt: Number,
                        csamt: Number
                    }
                }]
            }]
        }],
        b2cl: [{
            pos: String,
            invoices: [{
                inum: String,
                idt: Date,
                val: Number,
                items: [{
                    num: Number,
                    itm_det: {
                        rt: Number,
                        txval: Number,
                        iamt: Number
                    }
                }]
            }]
        }],
        b2cs: [{
            sply_ty: String,
            pos: String,
            typ: String,
            rt: Number,
            txval: Number,
            iamt: Number,
            camt: Number,
            samt: Number,
            csamt: Number
        }]
    },

    // GSTR-3B specific fields
    gstr3bData: {
        sup_details: {
            osup_zero: { txval: Number, iamt: Number },
            osup_nil_exmp: { txval: Number },
            osup_nongst: { txval: Number },
            isup_rev: { txval: Number, iamt: Number, camt: Number, samt: Number, csamt: Number },
            osup_det: { txval: Number, iamt: Number, camt: Number, samt: Number, csamt: Number }
        },
        inter_sup: {
            unreg_details: [{ pos: String, txval: Number, iamt: Number }],
            comp_details: [{ pos: String, txval: Number, iamt: Number }],
            uin_details: [{ pos: String, txval: Number, iamt: Number }]
        },
        itc_elg: {
            itc_avl: [{ ty: String, iamt: Number, camt: Number, samt: Number, csamt: Number }],
            itc_rev: [{ ty: String, iamt: Number, camt: Number, samt: Number, csamt: Number }],
            itc_net: { iamt: Number, camt: Number, samt: Number, csamt: Number },
            itc_inelg: [{ ty: String, iamt: Number, camt: Number, samt: Number, csamt: Number }]
        },
        inward_sup: {
            isup_details: [{ ty: String, inter: Number, intra: Number }]
        },
        interest_waiver: {
            intr_details: { iamt: Number, camt: Number, samt: Number, csamt: Number }
        }
    },

    // Common fields for all returns
    totalTaxableValue: {
        type: Number,
        default: 0
    },
    totalTaxAmount: {
        igst: { type: Number, default: 0 },
        cgst: { type: Number, default: 0 },
        sgst: { type: Number, default: 0 },
        cess: { type: Number, default: 0 }
    },
    
    attachments: [{
        filename: String,
        url: String,
        size: Number,
        uploadDate: { type: Date, default: Date.now }
    }],
    
    validationErrors: [{
        field: String,
        message: String,
        severity: { type: String, enum: ['error', 'warning', 'info'] }
    }],
    
    submissionHistory: [{
        action: String,
        timestamp: { type: Date, default: Date.now },
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        details: String
    }],
    
    metadata: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
gstReturnSchema.index({ user: 1, returnType: 1, 'period.month': 1, 'period.year': 1 });
gstReturnSchema.index({ gstin: 1, returnType: 1, 'period.month': 1, 'period.year': 1 });
gstReturnSchema.index({ status: 1, dueDate: 1 });

// Virtual for period string
gstReturnSchema.virtual('periodString').get(function() {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[this.period.month - 1]} ${this.period.year}`;
});

// Virtual for overdue status
gstReturnSchema.virtual('isOverdue').get(function() {
    return this.status === 'draft' && this.dueDate < new Date();
});

// Method to calculate total tax
gstReturnSchema.methods.calculateTotalTax = function() {
    return this.totalTaxAmount.igst + this.totalTaxAmount.cgst + this.totalTaxAmount.sgst + this.totalTaxAmount.cess;
};

// Method to validate return data
gstReturnSchema.methods.validateReturnData = function() {
    const errors = [];
    
    // Basic validations
    if (!this.gstin || !this.gstin.match(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)) {
        errors.push({ field: 'gstin', message: 'Invalid GSTIN format', severity: 'error' });
    }
    
    if (this.dueDate < new Date()) {
        errors.push({ field: 'dueDate', message: 'Due date has passed', severity: 'warning' });
    }
    
    // Return type specific validations
    if (this.returnType === 'GSTR3B') {
        if (!this.gstr3bData || !this.gstr3bData.sup_details) {
            errors.push({ field: 'gstr3bData', message: 'Supply details are required for GSTR-3B', severity: 'error' });
        }
    }
    
    this.validationErrors = errors;
    return errors;
};

// Static method to get due date for return type and period
gstReturnSchema.statics.getDueDate = function(returnType, month, year) {
    const dueDates = {
        'GSTR1': 11, // 11th of next month
        'GSTR3B': 20, // 20th of next month
        'GSTR2': 15, // 15th of next month
        'GSTR9': 31  // 31st December of next financial year
    };
    
    const dueDay = dueDates[returnType] || 20;
    const dueDate = new Date(year, month, dueDay); // month is 0-indexed in Date constructor
    
    return dueDate;
};

// Static method to find overdue returns
gstReturnSchema.statics.findOverdueReturns = function(userId) {
    return this.find({
        user: userId,
        status: 'draft',
        dueDate: { $lt: new Date() }
    }).sort({ dueDate: 1 });
};

const GSTReturn = mongoose.model('GSTReturn', gstReturnSchema);

module.exports = GSTReturn;
