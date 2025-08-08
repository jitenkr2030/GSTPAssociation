// emailTemplates.js

const { formatDate } = require('./formatters');

/**
 * Generates an email template for account verification.
 * @param {string} username - The name of the user.
 * @param {string} verificationLink - The link to verify the user's email address.
 * @returns {string} - The HTML string for the account verification email.
 */
const accountVerificationTemplate = (username, verificationLink) => {
    return `
        <html>
            <body>
                <h1>Welcome to Our Platform, ${username}!</h1>
                <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
                <a href="${verificationLink}" target="_blank">Verify Email</a>
                <p>If you did not create an account, please ignore this email.</p>
                <p>Best regards,<br/>The Team</p>
            </body>
        </html>
    `;
};

/**
 * Generates an email template for password reset.
 * @param {string} username - The name of the user.
 * @param {string} resetLink - The link to reset the user's password.
 * @returns {string} - The HTML string for the password reset email.
 */
const passwordResetTemplate = (username, resetLink) => {
    return `
        <html>
            <body>
                <h1>Hello, ${username}</h1>
                <p>You requested to reset your password. Click the link below to proceed:</p>
                <a href="${resetLink}" target="_blank">Reset Password</a>
                <p>If you did not request a password reset, please ignore this email.</p>
                <p>Best regards,<br/>The Team</p>
            </body>
        </html>
    `;
};

/**
 * Generates an email template for a general notification.
 * @param {string} username - The name of the user.
 * @param {string} notificationText - The text content of the notification.
 * @param {Date} date - The date of the notification.
 * @returns {string} - The HTML string for the notification email.
 */
const notificationTemplate = (username, notificationText, date) => {
    return `
        <html>
            <body>
                <h1>Hi, ${username}</h1>
                <p>${notificationText}</p>
                <p>Date: ${formatDate(date)}</p>
                <p>Best regards,<br/>The Team</p>
            </body>
        </html>
    `;
};

module.exports = {
    accountVerificationTemplate,
    passwordResetTemplate,
    notificationTemplate,
};
