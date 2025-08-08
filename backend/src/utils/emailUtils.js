const nodemailer = require('nodemailer');

// Function to send an email
const sendEmail = async (to, subject, text) => {
  let transporter = nodemailer.createTransport({
    service: 'Gmail', // or any other email service provider
    auth: {
      user: process.env.EMAIL_USER, // your email
      pass: process.env.EMAIL_PASS, // your email password
    },
  });

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = {
  sendEmail,
};
