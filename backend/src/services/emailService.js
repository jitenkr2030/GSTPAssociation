const nodemailer = require('nodemailer');
const { emailConfig } = require('../config/email');

// Configure the email transporter
const transporter = nodemailer.createTransport({
    host: emailConfig.host,
    port: emailConfig.port,
    secure: emailConfig.secure, // true for 465, false for other ports
    auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
    },
});

const sendEmail = async (to, subject, text, html) => {
    try {
        const mailOptions = {
            from: emailConfig.from,
            to,
            subject,
            text,
            html,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent: %s', info.messageId);
        return { message: 'Email sent successfully', info };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send email');
    }
};

const sendAccountVerificationEmail = async (user, verificationToken) => {
    const subject = 'Account Verification';
    const verificationLink = `${emailConfig.verificationUrl}?token=${verificationToken}`;
    const html = `<p>Hi ${user.username},</p><p>Please verify your account by clicking the link below:</p><a href="${verificationLink}">${verificationLink}</a>`;
    
    return await sendEmail(user.email, subject, null, html);
};

const sendPasswordResetEmail = async (user, resetToken) => {
    const subject = 'Password Reset Request';
    const resetLink = `${emailConfig.resetUrl}?token=${resetToken}`;
    const html = `<p>Hi ${user.username},</p><p>You requested to reset your password. Click the link below to reset it:</p><a href="${resetLink}">${resetLink}</a>`;
    
    return await sendEmail(user.email, subject, null, html);
};

module.exports = {
    sendEmail,
    sendAccountVerificationEmail,
    sendPasswordResetEmail,
};
