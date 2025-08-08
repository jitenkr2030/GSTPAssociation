const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: function() {
            return !this.socialLogin.google.id && !this.socialLogin.facebook.id && !this.socialLogin.linkedin.id;
        },
        minlength: 6,
    },

    // Mobile and OTP
    mobile: {
        type: String,
        unique: true,
        sparse: true,
        validate: {
            validator: function(v) {
                return !v || /^[6-9]\d{9}$/.test(v);
            },
            message: 'Please enter a valid Indian mobile number'
        }
    },
    mobileVerified: {
        type: Boolean,
        default: false
    },
    otpCode: {
        type: String,
        select: false
    },
    otpExpiry: {
        type: Date,
        select: false
    },

    // Email Verification
    emailVerified: {
        type: Boolean,
        default: false
    },
    emailVerificationToken: {
        type: String,
        select: false
    },

    // Role-based Access Control
    role: {
        type: String,
        enum: ['user', 'admin', 'gst_practitioner', 'consultant', 'accountant', 'business_owner', 'moderator'],
        default: 'user',
    },
    permissions: [{
        type: String,
        enum: ['read_users', 'write_users', 'delete_users', 'manage_forum', 'manage_events', 'manage_resources', 'view_analytics', 'manage_payments']
    }],

    // Profile Information
    profile: {
        firstName: String,
        lastName: String,
        avatar: String,
        bio: String,
        dateOfBirth: Date,
        gender: {
            type: String,
            enum: ['male', 'female', 'other', 'prefer_not_to_say']
        },
        address: {
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: {
                type: String,
                default: 'India'
            }
        },
        // Professional Information
        profession: {
            type: String,
            enum: ['gst_practitioner', 'chartered_accountant', 'tax_consultant', 'business_owner', 'student', 'other']
        },
        experience: {
            type: Number, // years of experience
            min: 0
        },
        specialization: [String], // Areas of specialization
        qualifications: [String],
        gstRegistrationNumber: String,
        panNumber: String,
        companyName: String,
        website: String,
        linkedinProfile: String,
    },

    // Social Login
    socialLogin: {
        google: {
            id: String,
            email: String,
            name: String,
            picture: String
        },
        facebook: {
            id: String,
            email: String,
            name: String,
            picture: String
        },
        linkedin: {
            id: String,
            email: String,
            name: String,
            picture: String
        }
    },

    // Two-Factor Authentication
    twoFactorAuth: {
        enabled: {
            type: Boolean,
            default: false
        },
        secret: {
            type: String,
            select: false
        },
        backupCodes: [{
            code: String,
            used: {
                type: Boolean,
                default: false
            }
        }],
        method: {
            type: String,
            enum: ['app', 'sms', 'email'],
            default: 'app'
        }
    },

    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    blockReason: String,

    // Login Information
    lastLogin: Date,
    loginAttempts: {
        type: Number,
        default: 0
    },
    lockUntil: Date,

    // Password Reset
    resetPasswordToken: {
        type: String,
        select: false
    },
    resetPasswordExpiry: {
        type: Date,
        select: false
    },

    // Membership Information
    membership: {
        type: {
            type: String,
            enum: ['free', 'basic', 'premium', 'elite'],
            default: 'free'
        },
        startDate: Date,
        endDate: Date,
        autoRenewal: {
            type: Boolean,
            default: false
        },
        paymentMethod: String
    },

    // Preferences
    preferences: {
        notifications: {
            email: {
                type: Boolean,
                default: true
            },
            sms: {
                type: Boolean,
                default: false
            },
            push: {
                type: Boolean,
                default: true
            }
        },
        privacy: {
            profileVisibility: {
                type: String,
                enum: ['public', 'members_only', 'private'],
                default: 'members_only'
            },
            showEmail: {
                type: Boolean,
                default: false
            },
            showMobile: {
                type: Boolean,
                default: false
            }
        },
        language: {
            type: String,
            default: 'en'
        },
        timezone: {
            type: String,
            default: 'Asia/Kolkata'
        }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
    if (this.profile.firstName && this.profile.lastName) {
        return `${this.profile.firstName} ${this.profile.lastName}`;
    }
    return this.name;
});

// Virtual for account lock status
userSchema.virtual('isLocked').get(function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Hash password before saving the user
userSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Update lastLogin on successful login
userSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    this.loginAttempts = 0;
    this.lockUntil = undefined;
    return this.save();
};

// Increment login attempts
userSchema.methods.incLoginAttempts = function() {
    // If we have a previous lock that has expired, restart at 1
    if (this.lockUntil && this.lockUntil < Date.now()) {
        return this.updateOne({
            $unset: { lockUntil: 1 },
            $set: { loginAttempts: 1 }
        });
    }

    const updates = { $inc: { loginAttempts: 1 } };

    // Lock account after 5 failed attempts for 2 hours
    if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
        updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
    }

    return this.updateOne(updates);
};

// Match user entered password with hashed password in the database
userSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password) return false;
    return await bcrypt.compare(enteredPassword, this.password);
};

// Generate OTP for mobile verification
userSchema.methods.generateOTP = function() {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpCode = otp;
    this.otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return otp;
};

// Verify OTP
userSchema.methods.verifyOTP = function(otp) {
    if (!this.otpCode || !this.otpExpiry) return false;
    if (this.otpExpiry < new Date()) return false;
    return this.otpCode === otp;
};

// Generate email verification token
userSchema.methods.generateEmailVerificationToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.emailVerificationToken = token;
    return token;
};

// Generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    this.resetPasswordToken = token;
    this.resetPasswordExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    return token;
};

// Check if user has permission
userSchema.methods.hasPermission = function(permission) {
    if (this.role === 'admin') return true;
    return this.permissions.includes(permission);
};

// Get role permissions
userSchema.methods.getRolePermissions = function() {
    const rolePermissions = {
        admin: ['read_users', 'write_users', 'delete_users', 'manage_forum', 'manage_events', 'manage_resources', 'view_analytics', 'manage_payments'],
        moderator: ['manage_forum', 'manage_events', 'manage_resources'],
        gst_practitioner: ['read_users', 'manage_forum'],
        consultant: ['read_users', 'manage_forum'],
        accountant: ['read_users', 'manage_forum'],
        business_owner: ['read_users'],
        user: ['read_users']
    };

    return rolePermissions[this.role] || [];
};

// Update membership
userSchema.methods.updateMembership = function(membershipType, duration = 365) {
    this.membership.type = membershipType;
    this.membership.startDate = new Date();
    this.membership.endDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
    return this.save();
};

// Check if membership is active
userSchema.methods.isMembershipActive = function() {
    if (this.membership.type === 'free') return true;
    return this.membership.endDate && this.membership.endDate > new Date();
};

const User = mongoose.model('User', userSchema);

module.exports = User;
                                                                                                                                                                                                        