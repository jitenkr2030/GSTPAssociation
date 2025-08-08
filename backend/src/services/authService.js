const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');
const { sendEmail } = require('../utils/emailUtils');
const { sendSMS } = require('../utils/smsUtils');
const { generateToken, verifyToken } = require('../config/jwt');

// Register function with enhanced features
const register = async (req, res) => {
  try {
    const { name, email, password, mobile, role = 'user' } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email }, { mobile: mobile || null }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or mobile number'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      mobile,
      role,
      emailVerified: false,
      mobileVerified: false
    });

    // Generate email verification token
    const emailToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    await sendVerificationEmail(user, emailToken);

    // If mobile provided, send OTP
    if (mobile) {
      const otp = user.generateOTP();
      await user.save();
      await sendSMS(mobile, `Your GSTPAssociation verification OTP is: ${otp}`);
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please verify your email and mobile number.',
      userId: user._id
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Enhanced login function with security features
const login = async (req, res) => {
  try {
    const { email, password, mobile, otp, twoFactorCode } = req.body;

    // Find user by email or mobile
    const user = await User.findOne({
      $or: [{ email }, { mobile }]
    }).select('+password +loginAttempts +lockUntil');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (user.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to too many failed login attempts'
      });
    }

    // Check if account is blocked
    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked. Please contact support.'
      });
    }

    // Verify password or OTP
    let isValid = false;
    if (password) {
      isValid = await user.matchPassword(password);
    } else if (otp && mobile) {
      isValid = user.verifyOTP(otp);
    }

    if (!isValid) {
      await user.incLoginAttempts();
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check 2FA if enabled
    if (user.twoFactorAuth.enabled) {
      if (!twoFactorCode) {
        return res.status(200).json({
          success: true,
          requiresTwoFactor: true,
          message: 'Two-factor authentication required'
        });
      }

      const verified = speakeasy.totp.verify({
        secret: user.twoFactorAuth.secret,
        encoding: 'base32',
        token: twoFactorCode,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({
          success: false,
          message: 'Invalid two-factor authentication code'
        });
      }
    }

    // Update login info
    await user.updateLastLogin();

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      permissions: user.getRolePermissions()
    });

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.twoFactorAuth.secret;
    delete userResponse.otpCode;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Send OTP for mobile verification
const sendMobileOTP = async (req, res) => {
  try {
    const { mobile } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this mobile number'
      });
    }

    const otp = user.generateOTP();
    await user.save();

    await sendSMS(mobile, `Your GSTPAssociation OTP is: ${otp}. Valid for 10 minutes.`);

    res.json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
};

// Verify mobile OTP
const verifyMobileOTP = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.verifyOTP(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.mobileVerified = true;
    user.otpCode = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Mobile number verified successfully'
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ emailVerificationToken: token });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email'
    });
  }
};

// Resend verification email
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    const token = user.generateEmailVerificationToken();
    await user.save();

    await sendVerificationEmail(user, token);

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending verification email'
    });
  }
};

// Setup Two-Factor Authentication
const setupTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `GSTPAssociation (${user.email})`,
      issuer: 'GSTPAssociation'
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    // Save secret temporarily (not enabled until verified)
    user.twoFactorAuth.secret = secret.base32;
    await user.save();

    res.json({
      success: true,
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error setting up two-factor authentication'
    });
  }
};

// Verify and enable Two-Factor Authentication
const verifyTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    const user = await User.findById(userId).select('+twoFactorAuth.secret');

    if (!user || !user.twoFactorAuth.secret) {
      return res.status(400).json({
        success: false,
        message: 'Two-factor authentication not set up'
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorAuth.secret,
      encoding: 'base32',
      token,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    // Enable 2FA and generate backup codes
    user.twoFactorAuth.enabled = true;
    user.twoFactorAuth.backupCodes = generateBackupCodes();
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication enabled successfully',
      backupCodes: user.twoFactorAuth.backupCodes.map(code => code.code)
    });
  } catch (error) {
    console.error('Verify 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying two-factor authentication'
    });
  }
};

// Disable Two-Factor Authentication
const disableTwoFactor = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

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

    // Disable 2FA
    user.twoFactorAuth.enabled = false;
    user.twoFactorAuth.secret = undefined;
    user.twoFactorAuth.backupCodes = [];
    await user.save();

    res.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Error disabling two-factor authentication'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email address'
      });
    }

    const resetToken = user.generatePasswordResetToken();
    await user.save();

    await sendPasswordResetEmail(user, resetToken);

    res.json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending password reset email'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select('+password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await user.matchPassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error changing password'
    });
  }
};

// Logout
const logout = async (req, res) => {
  try {
    // In a more sophisticated setup, you might want to blacklist the token
    // For now, we'll just send a success response
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// Social login (Google)
const googleLogin = async (req, res) => {
  try {
    const { googleId, email, name, picture } = req.body;

    let user = await User.findOne({
      $or: [
        { email },
        { 'socialLogin.google.id': googleId }
      ]
    });

    if (user) {
      // Update Google info if user exists
      user.socialLogin.google = { id: googleId, email, name, picture };
      user.emailVerified = true;
      await user.save();
    } else {
      // Create new user
      user = new User({
        name,
        email,
        emailVerified: true,
        socialLogin: {
          google: { id: googleId, email, name, picture }
        }
      });
      await user.save();
    }

    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
      permissions: user.getRolePermissions()
    });

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Google login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during Google login'
    });
  }
};

// Utility functions
const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email/${token}`;
  const emailContent = `
    <h2>Welcome to GSTPAssociation!</h2>
    <p>Please click the link below to verify your email address:</p>
    <a href="${verificationUrl}">Verify Email</a>
    <p>This link will expire in 24 hours.</p>
  `;

  await sendEmail(user.email, 'Verify Your Email - GSTPAssociation', emailContent);
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  const emailContent = `
    <h2>Password Reset Request</h2>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <a href="${resetUrl}">Reset Password</a>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  await sendEmail(user.email, 'Password Reset - GSTPAssociation', emailContent);
};

const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    codes.push({
      code: crypto.randomBytes(4).toString('hex').toUpperCase(),
      used: false
    });
  }
  return codes;
};

module.exports = {
  register,
  login,
  sendMobileOTP,
  verifyMobileOTP,
  verifyEmail,
  resendVerificationEmail,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
  googleLogin
};
