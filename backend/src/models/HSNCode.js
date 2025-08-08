const mongoose = require('mongoose');

const hsnCodeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    description: {
        type: String,
        required: true,
        index: 'text'
    },
    chapter: {
        type: String,
        required: true
    },
    chapterDescription: {
        type: String,
        required: true
    },
    heading: {
        type: String,
        required: true
    },
    headingDescription: {
        type: String,
        required: true
    },
    subHeading: String,
    subHeadingDescription: String,
    
    // GST Rates
    gstRates: {
        cgst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        sgst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        igst: {
            type: Number,
            default: 0,
            min: 0,
            max: 50
        },
        cess: {
            type: Number,
            default: 0,
            min: 0
        },
        compensationCess: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    
    // Additional Information
    unit: {
        type: String,
        default: 'UNT'
    },
    exemptions: [{
        notificationNo: String,
        date: Date,
        description: String,
        conditions: String
    }],
    
    // Classification
    category: {
        type: String,
        enum: ['Goods', 'Services'],
        default: 'Goods'
    },
    
    // Compliance Requirements
    complianceRequirements: {
        eWayBillRequired: {
            type: Boolean,
            default: true
        },
        reverseChargeApplicable: {
            type: Boolean,
            default: false
        },
        tdsApplicable: {
            type: Boolean,
            default: false
        },
        tcsApplicable: {
            type: Boolean,
            default: false
        }
    },
    
    // Usage Statistics
    usageCount: {
        type: Number,
        default: 0
    },
    lastUsed: Date,
    
    // Status
    isActive: {
        type: Boolean,
        default: true
    },
    
    // Metadata
    effectiveFrom: Date,
    effectiveTo: Date,
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    updatedBy: String,
    
    // Related Codes
    relatedCodes: [String],
    parentCode: String,
    childCodes: [String],
    
    // Additional Properties
    properties: {
        type: Map,
        of: String
    }
}, {
    timestamps: true
});

// Indexes for efficient searching
hsnCodeSchema.index({ code: 1 });
hsnCodeSchema.index({ description: 'text', chapterDescription: 'text', headingDescription: 'text' });
hsnCodeSchema.index({ chapter: 1, heading: 1 });
hsnCodeSchema.index({ 'gstRates.igst': 1 });
hsnCodeSchema.index({ category: 1, isActive: 1 });

// Virtual for total GST rate
hsnCodeSchema.virtual('totalGSTRate').get(function() {
    return this.gstRates.cgst + this.gstRates.sgst + this.gstRates.igst;
});

// Virtual for effective GST rate (CGST + SGST or IGST)
hsnCodeSchema.virtual('effectiveGSTRate').get(function() {
    return this.gstRates.igst > 0 ? this.gstRates.igst : (this.gstRates.cgst + this.gstRates.sgst);
});

// Method to increment usage count
hsnCodeSchema.methods.incrementUsage = function() {
    this.usageCount += 1;
    this.lastUsed = new Date();
    return this.save();
};

// Method to check if code is currently effective
hsnCodeSchema.methods.isCurrentlyEffective = function() {
    const now = new Date();
    const effectiveFrom = this.effectiveFrom || new Date('2017-07-01');
    const effectiveTo = this.effectiveTo || new Date('2099-12-31');
    
    return now >= effectiveFrom && now <= effectiveTo;
};

// Static method to search HSN codes
hsnCodeSchema.statics.searchCodes = function(query, options = {}) {
    const {
        limit = 20,
        skip = 0,
        category = null,
        gstRate = null,
        sortBy = 'code'
    } = options;
    
    let searchQuery = { isActive: true };
    
    if (query) {
        // Search in code, description, chapter description, and heading description
        searchQuery.$or = [
            { code: new RegExp(query, 'i') },
            { description: new RegExp(query, 'i') },
            { chapterDescription: new RegExp(query, 'i') },
            { headingDescription: new RegExp(query, 'i') }
        ];
    }
    
    if (category) {
        searchQuery.category = category;
    }
    
    if (gstRate !== null) {
        searchQuery['gstRates.igst'] = gstRate;
    }
    
    return this.find(searchQuery)
        .sort({ [sortBy]: 1 })
        .limit(limit)
        .skip(skip);
};

// Static method to get popular HSN codes
hsnCodeSchema.statics.getPopularCodes = function(limit = 10) {
    return this.find({ isActive: true })
        .sort({ usageCount: -1 })
        .limit(limit);
};

// Static method to get codes by GST rate
hsnCodeSchema.statics.getCodesByGSTRate = function(rate) {
    return this.find({
        isActive: true,
        'gstRates.igst': rate
    }).sort({ code: 1 });
};

// Static method to get chapter-wise summary
hsnCodeSchema.statics.getChapterSummary = function() {
    return this.aggregate([
        { $match: { isActive: true } },
        {
            $group: {
                _id: {
                    chapter: '$chapter',
                    chapterDescription: '$chapterDescription'
                },
                count: { $sum: 1 },
                avgGSTRate: { $avg: '$gstRates.igst' }
            }
        },
        { $sort: { '_id.chapter': 1 } }
    ]);
};

// Pre-save middleware to update lastUpdated
hsnCodeSchema.pre('save', function(next) {
    if (this.isModified() && !this.isNew) {
        this.lastUpdated = new Date();
    }
    next();
});

const HSNCode = mongoose.model('HSNCode', hsnCodeSchema);

module.exports = HSNCode;
