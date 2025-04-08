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
const logoUrl =
  'https://i.ibb.co/0pgvhwhZ/rn-image-picker-lib-temp-22395d66-3916-47ad-8c4c-5e04f38bc9c5.png';

const sendVerificationEmail = async (
  email,
  token,
  emailType = 'verification'
) => {
  try {
    const imageUrl =
      'https://i.ibb.co/8L3gfy4F/email-2151046-640.webp';

    let verificationUrl, subject;

    if (emailType === 'reactivation') {
      verificationUrl = `${process.env.BASEURL}/event-management/user/verify/${token}`;
      subject = EMAIL.SUBJECTS.REACTIVATE_ACCOUNT || 'Reactivate Your Account';
    } else {
      verificationUrl = `${process.env.BASEURL}/event-management/user/verify/${token}`;
      subject = EMAIL.SUBJECTS.VERIFY_EMAIL || 'Verify Your Email';
    }

    const appName = APP.NAME;

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
      supportUrl: 'https://support.google.com',
      emailType,
    });

    // Send the email
    await transporter.sendMail({
      to: email,
      subject: subject,
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
    const imageUrl =
      'https://i.ibb.co/bjn5nn6K/lock.png';
    // Render the EJS template
    const emailTemplatePath = path.resolve(
      __dirname,
      '../../src/emails/templates/resetPassword.template.ejs'
    );
    const emailBody = await ejs.renderFile(emailTemplatePath, {
      imageUrl,
      appName,
      resetToken,
      logoUrl,
      userName,
      supportUrl: 'https://support.google.com',
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
