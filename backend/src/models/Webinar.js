const mongoose = require('mongoose');

const webinarSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000
    },
    shortDescription: {
        type: String,
        required: true,
        maxlength: 300
    },
    
    // Host information
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coHosts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    speakers: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        name: String, // For external speakers
        title: String,
        bio: String,
        avatar: String,
        linkedinProfile: String
    }],
    
    // Webinar details
    category: {
        type: String,
        required: true,
        enum: [
            'GST Updates',
            'Compliance Training',
            'Tax Planning',
            'Industry Insights',
            'Software Training',
            'Q&A Sessions',
            'Case Studies',
            'Expert Interviews'
        ]
    },
    level: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced', 'all_levels']
    },
    language: {
        type: String,
        default: 'English'
    },
    
    // Scheduling
    scheduledAt: {
        type: Date,
        required: true
    },
    duration: {
        type: Number, // in minutes
        required: true,
        min: 15,
        max: 480
    },
    timezone: {
        type: String,
        default: 'Asia/Kolkata'
    },
    
    // Registration
    registrationDeadline: Date,
    maxAttendees: {
        type: Number,
        min: 1
    },
    registrationFee: {
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        currency: {
            type: String,
            default: 'INR'
        }
    },
    
    // Access control
    accessType: {
        type: String,
        enum: ['free', 'paid', 'members_only', 'premium_only'],
        default: 'free'
    },
    requiredMembership: {
        type: String,
        enum: ['free', 'basic', 'premium', 'elite'],
        default: 'free'
    },
    
    // Media
    thumbnail: {
        url: String,
        alt: String
    },
    bannerImage: {
        url: String,
        alt: String
    },
    
    // Webinar platform details
    platform: {
        type: String,
        enum: ['zoom', 'teams', 'webex', 'youtube', 'custom'],
        default: 'zoom'
    },
    meetingDetails: {
        meetingId: String,
        meetingPassword: String,
        joinUrl: String,
        hostUrl: String,
        dialInNumbers: [String]
    },
    
    // Recording
    recording: {
        isRecorded: {
            type: Boolean,
            default: true
        },
        recordingUrl: String,
        recordingPassword: String,
        recordingDuration: Number, // in minutes
        recordingSize: Number, // in MB
        availableUntil: Date
    },
    
    // Status
    status: {
        type: String,
        enum: ['scheduled', 'live', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    
    // Registrations
    registrations: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        registeredAt: {
            type: Date,
            default: Date.now
        },
        attended: {
            type: Boolean,
            default: false
        },
        joinedAt: Date,
        leftAt: Date,
        attendanceDuration: Number, // in minutes
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed', 'refunded'],
            default: 'paid'
        },
        paymentId: String,
        certificateIssued: {
            type: Boolean,
            default: false
        },
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        feedbackSubmittedAt: Date
    }],
    
    // Content
    agenda: [{
        topic: {
            type: String,
            required: true
        },
        duration: Number, // in minutes
        speaker: String,
        description: String
    }],
    
    // Resources
    resources: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        type: {
            type: String,
            enum: ['pdf', 'ppt', 'doc', 'video', 'link', 'other'],
            required: true
        },
        url: String,
        filename: String,
        size: Number,
        availableToAll: {
            type: Boolean,
            default: false
        }
    }],
    
    // Q&A
    questions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        question: {
            type: String,
            required: true
        },
        askedAt: {
            type: Date,
            default: Date.now
        },
        isAnswered: {
            type: Boolean,
            default: false
        },
        answer: String,
        answeredBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        answeredAt: Date,
        isPublic: {
            type: Boolean,
            default: true
        },
        upvotes: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    
    // Analytics
    analytics: {
        totalRegistrations: {
            type: Number,
            default: 0
        },
        actualAttendees: {
            type: Number,
            default: 0
        },
        averageAttendanceTime: Number, // in minutes
        peakAttendance: Number,
        averageRating: {
            type: Number,
            default: 0
        },
        totalRatings: {
            type: Number,
            default: 0
        },
        recordingViews: {
            type: Number,
            default: 0
        }
    },
    
    // Follow-up
    followUp: {
        emailSent: {
            type: Boolean,
            default: false
        },
        emailSentAt: Date,
        surveyUrl: String,
        nextWebinarSuggestions: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Webinar'
        }]
    },
    
    // SEO
    metaTitle: String,
    metaDescription: String,
    tags: [String]
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
webinarSchema.index({ title: 'text', description: 'text' });
webinarSchema.index({ category: 1, status: 1 });
webinarSchema.index({ scheduledAt: 1, status: 1 });
webinarSchema.index({ host: 1 });
webinarSchema.index({ accessType: 1, requiredMembership: 1 });

// Virtual for registration count
webinarSchema.virtual('registrationCount').get(function() {
    return this.registrations.length;
});

// Virtual for attendance rate
webinarSchema.virtual('attendanceRate').get(function() {
    if (this.registrations.length === 0) return 0;
    const attendedCount = this.registrations.filter(reg => reg.attended).length;
    return Math.round((attendedCount / this.registrations.length) * 100);
});

// Virtual for webinar URL
webinarSchema.virtual('url').get(function() {
    return `/webinars/${this.slug}`;
});

// Virtual for is upcoming
webinarSchema.virtual('isUpcoming').get(function() {
    return this.scheduledAt > new Date() && this.status === 'scheduled';
});

// Virtual for is live
webinarSchema.virtual('isLive').get(function() {
    const now = new Date();
    const endTime = new Date(this.scheduledAt.getTime() + this.duration * 60000);
    return now >= this.scheduledAt && now <= endTime && this.status === 'live';
});

// Pre-save middleware
webinarSchema.pre('save', function(next) {
    // Generate slug
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Update analytics
    if (this.isModified('registrations')) {
        this.analytics.totalRegistrations = this.registrations.length;
        this.analytics.actualAttendees = this.registrations.filter(reg => reg.attended).length;
        
        // Calculate average rating
        const ratings = this.registrations
            .filter(reg => reg.rating)
            .map(reg => reg.rating);
        
        if (ratings.length > 0) {
            this.analytics.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            this.analytics.totalRatings = ratings.length;
        }
        
        // Calculate average attendance time
        const attendanceTimes = this.registrations
            .filter(reg => reg.attendanceDuration)
            .map(reg => reg.attendanceDuration);
        
        if (attendanceTimes.length > 0) {
            this.analytics.averageAttendanceTime = attendanceTimes.reduce((sum, time) => sum + time, 0) / attendanceTimes.length;
        }
    }
    
    next();
});

// Method to register user
webinarSchema.methods.registerUser = function(userId, paymentDetails = {}) {
    const existingRegistration = this.registrations.find(
        reg => reg.user.toString() === userId.toString()
    );
    
    if (existingRegistration) {
        throw new Error('User is already registered for this webinar');
    }
    
    if (this.maxAttendees && this.registrations.length >= this.maxAttendees) {
        throw new Error('Webinar is full');
    }
    
    if (this.registrationDeadline && new Date() > this.registrationDeadline) {
        throw new Error('Registration deadline has passed');
    }
    
    this.registrations.push({
        user: userId,
        paymentStatus: this.registrationFee.amount > 0 ? 'pending' : 'paid',
        paymentId: paymentDetails.paymentId
    });
    
    return this.save();
};

// Method to mark attendance
webinarSchema.methods.markAttendance = function(userId, joinedAt, leftAt) {
    const registration = this.registrations.find(
        reg => reg.user.toString() === userId.toString()
    );
    
    if (!registration) {
        throw new Error('User is not registered for this webinar');
    }
    
    registration.attended = true;
    registration.joinedAt = joinedAt;
    registration.leftAt = leftAt;
    
    if (joinedAt && leftAt) {
        registration.attendanceDuration = Math.round((leftAt - joinedAt) / (1000 * 60)); // in minutes
    }
    
    return this.save();
};

// Method to add question
webinarSchema.methods.addQuestion = function(userId, question) {
    this.questions.push({
        user: userId,
        question
    });
    
    return this.save();
};

// Method to answer question
webinarSchema.methods.answerQuestion = function(questionId, answer, answeredBy) {
    const question = this.questions.id(questionId);
    
    if (!question) {
        throw new Error('Question not found');
    }
    
    question.answer = answer;
    question.answeredBy = answeredBy;
    question.answeredAt = new Date();
    question.isAnswered = true;
    
    return this.save();
};

// Static method to find upcoming webinars
webinarSchema.statics.findUpcoming = function(options = {}) {
    const { category, level, limit = 10, skip = 0 } = options;
    
    let query = {
        status: 'scheduled',
        scheduledAt: { $gt: new Date() }
    };
    
    if (category) query.category = category;
    if (level) query.level = level;
    
    return this.find(query)
        .populate('host', 'name profile.avatar')
        .populate('speakers.user', 'name profile.avatar')
        .sort({ scheduledAt: 1 })
        .limit(limit)
        .skip(skip);
};

// Static method to find past webinars with recordings
webinarSchema.statics.findRecorded = function(options = {}) {
    const { category, limit = 10, skip = 0 } = options;
    
    let query = {
        status: 'completed',
        'recording.recordingUrl': { $exists: true, $ne: null }
    };
    
    if (category) query.category = category;
    
    return this.find(query)
        .populate('host', 'name profile.avatar')
        .sort({ scheduledAt: -1 })
        .limit(limit)
        .skip(skip);
};

const Webinar = mongoose.model('Webinar', webinarSchema);

module.exports = Webinar;
