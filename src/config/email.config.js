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

// Common assets
const assets = {
  logo: 'https://i.postimg.cc/90hMnP5x/rn-image-picker-lib-temp-22395d66-3916-47ad-8c4c-5e04f38bc9c5.png',
  subscription: 'https://cdn-icons-png.flaticon.com/512/5234/5234307.png',
  supportUrl: 'https://support.google.com/',
  appName: APP.NAME,
};

/**
 * Generic email sender function
 * @param {string} email - Recipient email
 * @param {string} subject - Email subject
 * @param {string} template - Template name without extension
 * @param {Object} data - Dynamic data to populate the template
 */
const sendEmail = async (email, subject, template, data = {}) => {
  try {
    // Combine common data with specific template data
    const templateData = {
      ...assets,
      ...data,
      email,
    };

    // Render the template
    const emailTemplatePath = path.resolve(
      __dirname,
      `../../src/emails/templates/${template}.ejs`
    );

    const emailBody = await ejs.renderFile(emailTemplatePath, templateData);

    // Send the email
    await transporter.sendMail({
      to: email,
      subject: subject,
      html: emailBody,
    });

    console.log(`Email (${template}) sent to ${email}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${template} email:`, error);
    throw error;
  }
};

const sendVerificationEmail = async (
  email,
  token,
  emailType = 'verification'
) => {
  try {
    const subject =
      emailType === 'reactivation'
        ? EMAIL.SUBJECTS.REACTIVATE_ACCOUNT
        : EMAIL.SUBJECTS.VERIFY_EMAIL;

    const verificationUrl = `${process.env.BASEURL}/event-management/user/verify/${token}`;

    return sendEmail(email, subject, 'verifyUser.template', {
      verificationUrl,
      emailType,
      imageUrl: 'https://i.ibb.co/8L3gfy4F/email-2151046-640.webp',
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

const sendResetPasswordEmail = async (email, resetToken, userName) => {
  try {
    return sendEmail(
      email,
      EMAIL.SUBJECTS.RESET_PASSWORD,
      'resetPassword.template',
      {
        resetToken,
        userName,
        imageUrl: 'https://i.ibb.co/bjn5nn6K/lock.png',
      }
    );
  } catch (error) {
    console.error('Error sending reset password email:', error);
    throw error;
  }
};

// Subscription-related emails using a single template with different data
const sendSubscriptionEmail = async (email, data) => {
  const emailTypes = {
    PAYMENT_FAILURE: {
      subject:
        EMAIL.SUBJECTS.PAYMENT_FAILURE ||
        'Payment Failed for Your Subscription',
      template: 'subscription.template',
      icon: 'https://static.vecteezy.com/system/resources/previews/004/968/453/non_2x/failed-to-make-payment-by-credit-card-concept-illustration-flat-design-eps10-modern-graphic-element-for-landing-page-empty-state-ui-infographic-vector.jpg',
      // action: {
      //   text: 'Update Payment Method',
      //   url: `${process.env.CLIENT_URL}/account/payment`,
      // },
    },
    CANCELLATION: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_CANCELLED ||
        'Subscription Cancellation Confirmed',
      template: 'subscription.template',
      icon: 'https://png.pngtree.com/png-vector/20221125/ourmid/pngtree-cancel-icon-png-image_6480369.png',
      // action: {
      //   text: 'Resubscribe',
      //   url: `${process.env.CLIENT_URL}/pricing`,
      // },
    },
    EXPIRATION: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_EXPIRED || 'Your Subscription Has Expired',
      template: 'subscription.template',
      icon: 'https://cdn-icons-png.freepik.com/256/5626/5626141.png?semt=ais_hybrid',
      // action: {
      //   text: 'Renew Subscription',
      //   url: `${process.env.CLIENT_URL}/pricing`,
      // },
    },
    RENEWAL_STATUS: {
      subject:
        EMAIL.SUBJECTS.RENEWAL_STATUS || 'Subscription Renewal Status Updated',
      template: 'subscription.template',
      icon: 'https://cdn-icons-png.flaticon.com/512/11264/11264720.png',
      // action: {
      //   text: 'Manage Subscription',
      //   url: `${process.env.CLIENT_URL}/account/subscription`,
      // },
    },
    RECOVERY: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_RECOVERED ||
        'Your Subscription Has Been Recovered',
      template: 'subscription.template',
      icon: 'https://i.ibb.co/recovery-icon.png',
      // action: {
      //   text: 'View Subscription',
      //   url: `${process.env.CLIENT_URL}/account/subscription`,
      // },
    },
    GRACE_PERIOD_EXPIRED: {
      subject:
        EMAIL.SUBJECTS.GRACE_PERIOD_EXPIRED ||
        'Grace Period Ended - Subscription Expired',
      template: 'subscription.template',
      icon: 'https://cdn-icons-png.flaticon.com/512/2037/2037117.png',
      // action: {
      //   text: 'Renew Subscription',
      //   url: `${process.env.CLIENT_URL}/pricing`,
      // },
    },
    SUBSCRIPTION_STARTED: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_STARTED || 'Welcome to Your Subscription',
      template: 'subscription.template',
      icon: 'https://img.freepik.com/premium-vector/success-online-payment-icon-illustration-design_8499-6184.jpg',
      // action: {
      //   text: 'View Subscription',
      //   url: `${process.env.CLIENT_URL}/account/subscription`,
      // },
    },
    PLAN_CHANGED: {
      subject:
        EMAIL.SUBJECTS.PLAN_CHANGED || 'Your Subscription Plan Has Changed',
      template: 'subscription.template',
      icon: 'https://cdn-icons-png.flaticon.com/512/11287/11287714.png',
      // action: {
      //   text: 'View Subscription',
      //   url: `${process.env.CLIENT_URL}/account/subscription`,
      // },
    },
  };

  const { type, user, subscription, additionalInfo } = data;
  const emailConfig = emailTypes[type];

  if (!emailConfig) {
    throw new Error(`Unknown subscription email type: ${type}`);
  }

  return sendEmail(email, emailConfig.subject, emailConfig.template, {
    user,
    subscription,
    additionalInfo,
    emailType: type,
    icon: emailConfig.icon,
    action: emailConfig.action,
    heading: emailConfig.subject,
  });
};

// Specific subscription email functions that use the generic sendSubscriptionEmail
const sendPaymentFailureEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'PAYMENT_FAILURE', ...data });
};

const sendCancellationEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'CANCELLATION', ...data });
};

const sendExpirationEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'EXPIRATION', ...data });
};

const sendRenewalStatusEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'RENEWAL_STATUS', ...data });
};

const sendRecoveryEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'RECOVERY', ...data });
};

const sendGracePeriodExpiredEmail = async (email, data) => {
  return sendSubscriptionEmail(email, {
    type: 'GRACE_PERIOD_EXPIRED',
    ...data,
  });
};

const sendSubscriptionStartedEmail = async (email, data) => {
  return sendSubscriptionEmail(email, {
    type: 'SUBSCRIPTION_STARTED',
    ...data,
  });
};

const sendPlanChangedEmail = async (email, data) => {
  return sendSubscriptionEmail(email, { type: 'PLAN_CHANGED', ...data });
};
module.exports = {
  sendVerificationEmail,
  sendResetPasswordEmail,
  sendPaymentFailureEmail,
  sendCancellationEmail,
  sendExpirationEmail,
  sendRenewalStatusEmail,
  sendRecoveryEmail,
  sendGracePeriodExpiredEmail,
  sendSubscriptionStartedEmail,
  sendPlanChangedEmail,
};
