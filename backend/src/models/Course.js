const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
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
        maxlength: 1000
    },
    shortDescription: {
        type: String,
        required: true,
        maxlength: 300
    },
    instructor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    coInstructors: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    
    // Course details
    category: {
        type: String,
        required: true,
        enum: [
            'GST Fundamentals',
            'Return Filing',
            'Compliance Management',
            'Tax Planning',
            'Industry Specific',
            'Advanced Topics',
            'Certification Programs',
            'Software Training'
        ]
    },
    level: {
        type: String,
        required: true,
        enum: ['beginner', 'intermediate', 'advanced']
    },
    language: {
        type: String,
        default: 'English'
    },
    duration: {
        hours: {
            type: Number,
            required: true,
            min: 0
        },
        minutes: {
            type: Number,
            default: 0,
            min: 0,
            max: 59
        }
    },
    
    // Pricing
    pricing: {
        type: {
            type: String,
            enum: ['free', 'paid', 'premium_only'],
            default: 'free'
        },
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        currency: {
            type: String,
            default: 'INR'
        },
        discountPrice: {
            type: Number,
            min: 0
        },
        discountValidUntil: Date
    },
    
    // Course structure
    modules: [{
        title: {
            type: String,
            required: true
        },
        description: String,
        order: {
            type: Number,
            required: true
        },
        lessons: [{
            title: {
                type: String,
                required: true
            },
            description: String,
            order: {
                type: Number,
                required: true
            },
            type: {
                type: String,
                enum: ['video', 'text', 'quiz', 'assignment', 'live_session'],
                required: true
            },
            content: {
                videoUrl: String,
                videoDuration: Number, // in seconds
                textContent: String,
                attachments: [{
                    title: String,
                    filename: String,
                    url: String,
                    size: Number
                }]
            },
            isPreview: {
                type: Boolean,
                default: false
            },
            completionCriteria: {
                type: String,
                enum: ['view', 'time_based', 'quiz_pass', 'assignment_submit'],
                default: 'view'
            },
            minCompletionTime: Number, // in seconds
            quiz: {
                questions: [{
                    question: String,
                    type: {
                        type: String,
                        enum: ['multiple_choice', 'true_false', 'short_answer']
                    },
                    options: [String],
                    correctAnswer: String,
                    explanation: String,
                    points: {
                        type: Number,
                        default: 1
                    }
                }],
                passingScore: {
                    type: Number,
                    default: 70
                },
                timeLimit: Number, // in minutes
                maxAttempts: {
                    type: Number,
                    default: 3
                }
            }
        }]
    }],
    
    // Media
    thumbnail: {
        url: String,
        alt: String
    },
    previewVideo: {
        url: String,
        duration: Number
    },
    
    // Course status
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: Date,
    
    // Enrollment
    enrollments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        enrolledAt: {
            type: Date,
            default: Date.now
        },
        progress: {
            completedLessons: [{
                moduleIndex: Number,
                lessonIndex: Number,
                completedAt: Date,
                timeSpent: Number, // in seconds
                score: Number // for quizzes
            }],
            overallProgress: {
                type: Number,
                default: 0,
                min: 0,
                max: 100
            },
            lastAccessedAt: Date
        },
        certificateIssued: {
            type: Boolean,
            default: false
        },
        certificateIssuedAt: Date,
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        review: String,
        reviewedAt: Date
    }],
    
    // Requirements and outcomes
    prerequisites: [String],
    learningOutcomes: [String],
    targetAudience: [String],
    
    // Ratings and reviews
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    
    // Course settings
    settings: {
        allowDownloads: {
            type: Boolean,
            default: false
        },
        allowDiscussions: {
            type: Boolean,
            default: true
        },
        certificateEnabled: {
            type: Boolean,
            default: true
        },
        passingScore: {
            type: Number,
            default: 70,
            min: 0,
            max: 100
        },
        maxEnrollments: Number,
        enrollmentDeadline: Date
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
courseSchema.index({ title: 'text', description: 'text' });
courseSchema.index({ category: 1, level: 1, status: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ 'pricing.type': 1, status: 1 });
courseSchema.index({ averageRating: -1, totalRatings: -1 });

// Virtual for total enrollment count
courseSchema.virtual('enrollmentCount').get(function() {
    return this.enrollments.length;
});

// Virtual for total lessons count
courseSchema.virtual('totalLessons').get(function() {
    return this.modules.reduce((total, module) => total + module.lessons.length, 0);
});

// Virtual for course URL
courseSchema.virtual('url').get(function() {
    return `/courses/${this.slug}`;
});

// Virtual for effective price
courseSchema.virtual('effectivePrice').get(function() {
    if (this.pricing.discountPrice && this.pricing.discountValidUntil > new Date()) {
        return this.pricing.discountPrice;
    }
    return this.pricing.amount;
});

// Pre-save middleware
courseSchema.pre('save', function(next) {
    // Generate slug
    if (this.isModified('title') && !this.slug) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }
    
    // Set published date
    if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
        this.publishedAt = new Date();
    }
    
    // Calculate average rating
    if (this.isModified('enrollments')) {
        const ratings = this.enrollments
            .filter(enrollment => enrollment.rating)
            .map(enrollment => enrollment.rating);
        
        if (ratings.length > 0) {
            this.averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
            this.totalRatings = ratings.length;
        }
    }
    
    next();
});

// Method to enroll user
courseSchema.methods.enrollUser = function(userId) {
    const existingEnrollment = this.enrollments.find(
        enrollment => enrollment.user.toString() === userId.toString()
    );
    
    if (existingEnrollment) {
        throw new Error('User is already enrolled in this course');
    }
    
    this.enrollments.push({
        user: userId,
        progress: {
            completedLessons: [],
            overallProgress: 0,
            lastAccessedAt: new Date()
        }
    });
    
    return this.save();
};

// Method to update user progress
courseSchema.methods.updateProgress = function(userId, moduleIndex, lessonIndex, completionData = {}) {
    const enrollment = this.enrollments.find(
        enrollment => enrollment.user.toString() === userId.toString()
    );
    
    if (!enrollment) {
        throw new Error('User is not enrolled in this course');
    }
    
    // Check if lesson is already completed
    const existingCompletion = enrollment.progress.completedLessons.find(
        completion => completion.moduleIndex === moduleIndex && completion.lessonIndex === lessonIndex
    );
    
    if (!existingCompletion) {
        enrollment.progress.completedLessons.push({
            moduleIndex,
            lessonIndex,
            completedAt: new Date(),
            timeSpent: completionData.timeSpent || 0,
            score: completionData.score || null
        });
    }
    
    // Calculate overall progress
    const totalLessons = this.totalLessons;
    const completedLessons = enrollment.progress.completedLessons.length;
    enrollment.progress.overallProgress = Math.round((completedLessons / totalLessons) * 100);
    enrollment.progress.lastAccessedAt = new Date();
    
    // Check if course is completed and issue certificate
    if (enrollment.progress.overallProgress >= this.settings.passingScore && !enrollment.certificateIssued) {
        enrollment.certificateIssued = true;
        enrollment.certificateIssuedAt = new Date();
    }
    
    return this.save();
};

// Method to add rating and review
courseSchema.methods.addRating = function(userId, rating, review = '') {
    const enrollment = this.enrollments.find(
        enrollment => enrollment.user.toString() === userId.toString()
    );
    
    if (!enrollment) {
        throw new Error('User must be enrolled to rate the course');
    }
    
    enrollment.rating = rating;
    enrollment.review = review;
    enrollment.reviewedAt = new Date();
    
    return this.save();
};

// Static method to find published courses
courseSchema.statics.findPublished = function(options = {}) {
    const { category, level, pricing, limit = 10, skip = 0, sort = { publishedAt: -1 } } = options;
    
    let query = { status: 'published' };
    
    if (category) query.category = category;
    if (level) query.level = level;
    if (pricing) query['pricing.type'] = pricing;
    
    return this.find(query)
        .populate('instructor', 'name profile.avatar profile.bio')
        .sort(sort)
        .limit(limit)
        .skip(skip);
};

// Static method to search courses
courseSchema.statics.searchCourses = function(searchTerm, options = {}) {
    const { category, level, limit = 10, skip = 0 } = options;
    
    let query = {
        status: 'published',
        $text: { $search: searchTerm }
    };
    
    if (category) query.category = category;
    if (level) query.level = level;
    
    return this.find(query, { score: { $meta: 'textScore' } })
        .populate('instructor', 'name profile.avatar')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip);
};

// Static method to get popular courses
courseSchema.statics.getPopular = function(limit = 10) {
    return this.find({ status: 'published' })
        .populate('instructor', 'name profile.avatar')
        .sort({ enrollmentCount: -1, averageRating: -1 })
        .limit(limit);
};

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
