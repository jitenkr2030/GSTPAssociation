const twilio = require('twilio');

// Initialize Twilio client
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Send SMS using Twilio
 * @param {string} to - Recipient phone number (with country code)
 * @param {string} message - SMS message content
 * @returns {Promise} - Twilio response
 */
const sendSMS = async (to, message) => {
  try {
    // Ensure phone number has country code
    const phoneNumber = to.startsWith('+91') ? to : `+91${to}`;
    
    const response = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });

    console.log(`SMS sent successfully to ${phoneNumber}:`, response.sid);
    return {
      success: true,
      messageId: response.sid,
      status: response.status
    };
  } catch (error) {
    console.error('SMS sending error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send OTP SMS
 * @param {string} mobile - Mobile number
 * @param {string} otp - OTP code
 * @returns {Promise} - SMS response
 */
const sendOTPSMS = async (mobile, otp) => {
  const message = `Your GSTPAssociation verification OTP is: ${otp}. Valid for 10 minutes. Do not share this code with anyone.`;
  return await sendSMS(mobile, message);
};

/**
 * Send welcome SMS
 * @param {string} mobile - Mobile number
 * @param {string} name - User name
 * @returns {Promise} - SMS response
 */
const sendWelcomeSMS = async (mobile, name) => {
  const message = `Welcome to GSTPAssociation, ${name}! Your account has been created successfully. Start exploring our GST tools and community features.`;
  return await sendSMS(mobile, message);
};

/**
 * Send password reset SMS
 * @param {string} mobile - Mobile number
 * @param {string} resetCode - Password reset code
 * @returns {Promise} - SMS response
 */
const sendPasswordResetSMS = async (mobile, resetCode) => {
  const message = `Your GSTPAssociation password reset code is: ${resetCode}. Valid for 1 hour. If you didn't request this, please ignore.`;
  return await sendSMS(mobile, message);
};

/**
 * Send compliance reminder SMS
 * @param {string} mobile - Mobile number
 * @param {string} reminderText - Reminder message
 * @returns {Promise} - SMS response
 */
const sendComplianceReminderSMS = async (mobile, reminderText) => {
  const message = `GSTPAssociation Reminder: ${reminderText}`;
  return await sendSMS(mobile, message);
};

/**
 * Send membership expiry reminder SMS
 * @param {string} mobile - Mobile number
 * @param {string} membershipType - Membership type
 * @param {number} daysLeft - Days left for expiry
 * @returns {Promise} - SMS response
 */
const sendMembershipReminderSMS = async (mobile, membershipType, daysLeft) => {
  const message = `Your GSTPAssociation ${membershipType} membership expires in ${daysLeft} days. Renew now to continue enjoying premium features.`;
  return await sendSMS(mobile, message);
};

/**
 * Validate Indian mobile number
 * @param {string} mobile - Mobile number to validate
 * @returns {boolean} - True if valid
 */
const validateIndianMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

/**
 * Format mobile number for display
 * @param {string} mobile - Mobile number
 * @returns {string} - Formatted mobile number
 */
const formatMobileNumber = (mobile) => {
  if (!mobile) return '';
  
  // Remove country code if present
  const cleanMobile = mobile.replace(/^\+91/, '');
  
  // Format as XXX-XXX-XXXX
  if (cleanMobile.length === 10) {
    return `${cleanMobile.slice(0, 3)}-${cleanMobile.slice(3, 6)}-${cleanMobile.slice(6)}`;
  }
  
  return mobile;
};

module.exports = {
  sendSMS,
  sendOTPSMS,
  sendWelcomeSMS,
  sendPasswordResetSMS,
  sendComplianceReminderSMS,
  sendMembershipReminderSMS,
  validateIndianMobile,
  formatMobileNumber
};
