const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const { SERVICE_NAME, APP } = require('../utils/common/constants');
const { EMAIL } = require('../utils/common/messages');

const transporter = nodemailer.createTransport({
  service: SERVICE_NAME,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendVerificationEmail = async (email, token) => {
  try {
    const logoUrl = 'https://i.ibb.co/jkPfpH0m/eventify-icon-filled-256.png';
    const imageUrl = 'https://i.ibb.co/JFCb046J/Mar-Business-18.jpg';
    const verificationUrl = `${process.env.BASEURL}/event-management/user/verify/${token}`;
    const appName = APP.NAME;
    // Render the EJS template
    const emailTemplatePath = path.resolve(
      __dirname,
      '../../src/emails/templates/verifyUser.template.ejs'
    );
    const emailBody = await ejs.renderFile(emailTemplatePath, {
      verificationUrl,
      appName,
      logoUrl,
      imageUrl,
      email,
      supportUrl: 'www.www.onion',
    });

    // Send the email
    await transporter.sendMail({
      to: email,
      subject: EMAIL.SUBJECTS.VERIFY_EMAIL,
      html: emailBody,
    });

    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendResetPasswordEmail = async (email, resetToken, userName) => {
  try {
    const appName = APP.NAME;
    // const logoUrl = 'https://i.ibb.co/v424L8f4/eventify.jpg';
    const logoUrl = 'https://i.ibb.co/jkPfpH0m/eventify-icon-filled-256.png';

    // Render the EJS template
    const emailTemplatePath = path.resolve(
      __dirname,
      '../../src/emails/templates/resetPassword.template.ejs'
    );
    const emailBody = await ejs.renderFile(emailTemplatePath, {
      appName,
      resetToken,
      logoUrl,
      userName,
      supportUrl: 'www.www.onion',
    });

    // Send the email
    await transporter.sendMail({
      to: email,
      subject: EMAIL.SUBJECTS.RESET_PASSWORD,
      html: emailBody,
    });

    console.log(`Reset password email sent to ${email}`);
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
