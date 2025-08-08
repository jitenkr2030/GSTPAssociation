const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
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
    excerpt: {
        type: String,
        required: true,
        maxlength: 500
    },
    content: {
        type: String,
        required: true
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: [
            'GST Basics',
            'Return Filing',
            'Compliance',
            'Tax Planning',
            'Case Studies',
            'Updates & Amendments',
            'Industry Specific',
            'Tools & Calculators',
            'Legal & Regulatory',
            'Best Practices'
        ]
    },
    tags: [{
        type: String,
        trim: true,
        lowercase: true
    }],
    featuredImage: {
        url: String,
        alt: String,
        caption: String
    },
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    publishedAt: Date,
    
    // SEO fields
    metaTitle: {
        type: String,
        maxlength: 60
    },
    metaDescription: {
        type: String,
        maxlength: 160
    },
    
    // Content structure
    tableOfContents: [{
        heading: String,
        anchor: String,
        level: {
            type: Number,
            min: 1,
            max: 6
        }
    }],
    
    // Engagement metrics
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    shares: {
        type: Number,
        default: 0
    },
    
    // Comments
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000
        },
        isApproved: {
            type: Boolean,
            default: false
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        replies: [{
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            content: {
                type: String,
                required: true,
                maxlength: 500
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }]
    }],
    
    // Access control
    isPremium: {
        type: Boolean,
        default: false
    },
    requiredMembership: {
        type: String,
        enum: ['free', 'basic', 'premium', 'elite'],
        default: 'free'
    },
    
    // Related content
    relatedArticles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
    }],
    
    // Reading time estimation
    readingTime: {
        type: Number, // in minutes
        default: 5
    },
    
    // Difficulty level
    difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced'],
        default: 'beginner'
    },
    
    // External resources
    externalLinks: [{
        title: String,
        url: String,
        description: String
    }],
    
    // Downloads
    attachments: [{
        title: String,
        filename: String,
        url: String,
        size: Number,
        mimeType: String,
        downloadCount: {
            type: Number,
            default: 0
        }
    }],
    
    // Analytics
    analytics: {
        avgReadingTime: Number,
        bounceRate: Number,
        completionRate: Number
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes
articleSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
articleSchema.index({ category: 1, status: 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ publishedAt: -1 });
articleSchema.index({ slug: 1 });
articleSchema.index({ author: 1 });

// Virtual for like count
articleSchema.virtual('likeCount').get(function() {
    return this.likes.length;
});

// Virtual for comment count
articleSchema.virtual('commentCount').get(function() {
    return this.comments.filter(comment => comment.isApproved).length;
});

// Virtual for URL
articleSchema.virtual('url').get(function() {
    return `/articles/${this.slug}`;
});

// Pre-save middleware to generate slug
articleSchema.pre('save', function(next) {
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
    
    // Calculate reading time (average 200 words per minute)
    if (this.isModified('content')) {
        const wordCount = this.content.split(/\s+/).length;
        this.readingTime = Math.ceil(wordCount / 200);
    }
    
    next();
});

// Method to increment views
articleSchema.methods.incrementViews = function() {
    this.views += 1;
    return this.save();
};

// Method to add like
articleSchema.methods.addLike = function(userId) {
    const existingLike = this.likes.find(like => like.user.toString() === userId.toString());
    if (!existingLike) {
        this.likes.push({ user: userId });
        return this.save();
    }
    return Promise.resolve(this);
};

// Method to remove like
articleSchema.methods.removeLike = function(userId) {
    this.likes = this.likes.filter(like => like.user.toString() !== userId.toString());
    return this.save();
};

// Method to add comment
articleSchema.methods.addComment = function(userId, content) {
    this.comments.push({
        user: userId,
        content,
        isApproved: false // Requires moderation
    });
    return this.save();
};

// Static method to find published articles
articleSchema.statics.findPublished = function(options = {}) {
    const { category, tags, limit = 10, skip = 0, sort = { publishedAt: -1 } } = options;
    
    let query = { status: 'published' };
    
    if (category) query.category = category;
    if (tags && tags.length > 0) query.tags = { $in: tags };
    
    return this.find(query)
        .populate('author', 'name profile.avatar')
        .sort(sort)
        .limit(limit)
        .skip(skip);
};

// Static method to search articles
articleSchema.statics.searchArticles = function(searchTerm, options = {}) {
    const { category, difficulty, limit = 10, skip = 0 } = options;
    
    let query = {
        status: 'published',
        $text: { $search: searchTerm }
    };
    
    if (category) query.category = category;
    if (difficulty) query.difficulty = difficulty;
    
    return this.find(query, { score: { $meta: 'textScore' } })
        .populate('author', 'name profile.avatar')
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit)
        .skip(skip);
};

// Static method to get popular articles
articleSchema.statics.getPopular = function(timeframe = 30, limit = 10) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeframe);
    
    return this.find({
        status: 'published',
        publishedAt: { $gte: startDate }
    })
    .populate('author', 'name profile.avatar')
    .sort({ views: -1, likeCount: -1 })
    .limit(limit);
};

const Article = mongoose.model('Article', articleSchema);

module.exports = Article;
