const User = require('../models/User');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).select('-password -twoFactorAuth.secret -otpCode');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
};

// Update user profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updates = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updates.password;
    delete updates.email;
    delete updates.mobile;
    delete updates.role;
    delete updates.permissions;
    delete updates.twoFactorAuth;
    delete updates.socialLogin;
    delete updates.membership;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password -twoFactorAuth.secret -otpCode');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// Upload profile avatar
const uploadAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          folder: 'gstpassociation/avatars',
          public_id: `avatar_${userId}`,
          transformation: [
            { width: 300, height: 300, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' }
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    // Update user avatar URL
    const user = await User.findByIdAndUpdate(
      userId,
      { 'profile.avatar': result.secure_url },
      { new: true }
    ).select('-password -twoFactorAuth.secret -otpCode');

    res.json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: result.secure_url,
      user
    });
  } catch (error) {
    console.error('Upload avatar error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading avatar'
    });
  }
};

// Update email (requires verification)
const updateEmail = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newEmail, password } = req.body;

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await user.matchPassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if email is already taken
    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Email is already in use'
      });
    }

    // Update email and mark as unverified
    user.email = newEmail;
    user.emailVerified = false;
    const token = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await sendVerificationEmail(user, token);

    res.json({
      success: true,
      message: 'Email updated. Please verify your new email address.'
    });
  } catch (error) {
    console.error('Update email error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating email'
    });
  }
};

// Update mobile (requires OTP verification)
const updateMobile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { newMobile, password } = req.body;

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await user.matchPassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Check if mobile is already taken
    const existingUser = await User.findOne({ mobile: newMobile });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is already in use'
      });
    }

    // Update mobile and mark as unverified
    user.mobile = newMobile;
    user.mobileVerified = false;
    const otp = user.generateOTP();
    await user.save();

    // Send OTP
    await sendSMS(newMobile, `Your GSTPAssociation mobile verification OTP is: ${otp}`);

    res.json({
      success: true,
      message: 'Mobile number updated. Please verify with the OTP sent to your new number.'
    });
  } catch (error) {
    console.error('Update mobile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating mobile number'
    });
  }
};

// Update preferences
const updatePreferences = async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true, runValidators: true }
    ).select('-password -twoFactorAuth.secret -otpCode');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences'
    });
  }
};

// Delete account
const deleteAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmText } = req.body;

    if (confirmText !== 'DELETE MY ACCOUNT') {
      return res.status(400).json({
        success: false,
        message: 'Please type "DELETE MY ACCOUNT" to confirm'
      });
    }

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const isValidPassword = await user.matchPassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Delete user account
    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting account'
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  uploadAvatar,
  updateEmail,
  updateMobile,
  updatePreferences,
  deleteAccount,
  upload
};
