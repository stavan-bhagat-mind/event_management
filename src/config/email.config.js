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
    // const logoUrl = 'https://i.ibb.co/jkPfpH0m/eventify-icon-filled-256.png';
    // red logo
    const logoUrl =
      'https://i.ibb.co/B29jMVLt/background-replacer-result-2.png';
    // const imageUrl =
    //   'https://img.freepik.com/premium-vector/opened-envelope-document-with-green-check-mark-line-icon-official-confirmation-message-mail-sent-successfully-email-delivery-verification-email-flat-design-vector_662353-720.jpg';

    const imageUrl =
      'https://cdn.pixabay.com/photo/2017/03/17/06/47/email-2151046_640.png';
    // const imageUrl =
    //   'https://banner2.cleanpng.com/20180621/lao/kisspng-business-management-industry-email-service-red-email-5b2c1b02b16672.8503048015296171547266.jpg';
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
    // const imageUrl = 'https://cdn-icons-png.flaticon.com/512/6434/6434880.png';
    // red lock
    // const imageUrl = 'https://cdn-icons-png.flaticon.com/512/1592/1592485.png';
    const imageUrl =
      'https://cdn-icons-png.flaticon.com/512/14440/14440335.png';
    // const logoUrl = 'https://i.ibb.co/jkPfpH0m/eventify-icon-filled-256.png';
    // red logo
    const logoUrl =
      'https://i.ibb.co/B29jMVLt/background-replacer-result-2.png';

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
