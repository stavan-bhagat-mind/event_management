const nodemailer = require('nodemailer');
const ejs = require('ejs');
const path = require('path');
const {
  SERVICE_NAME,
  APP,
  IMAGE_URL,
  LINKS,
} = require('../utils/common/constants');
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
  logo: IMAGE_URL.APP_LOGO,
  subscription: IMAGE_URL.SUBSCRIPTION.SUBSCRIPTION_MAIN,
  supportUrl: LINKS.SUPPORT,
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
      imageUrl: IMAGE_URL.VERIFICATION,
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
        imageUrl: IMAGE_URL.RESET_PASSWORD,
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
      icon: IMAGE_URL.SUBSCRIPTION.PAYMENT_FAILURE,
    },
    CANCELLATION: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_CANCELLED ||
        'Subscription Cancellation Confirmed',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.CANCELLATION,
    },
    EXPIRATION: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_EXPIRED || 'Your Subscription Has Expired',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.EXPIRATION,
    },
    RENEWAL_STATUS: {
      subject:
        EMAIL.SUBJECTS.RENEWAL_STATUS || 'Subscription Renewal Status Updated',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.RENEWAL_STATUS,
    },
    RECOVERY: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_RECOVERED ||
        'Your Subscription Has Been Recovered',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.RECOVERY,
    },
    GRACE_PERIOD_EXPIRED: {
      subject:
        EMAIL.SUBJECTS.GRACE_PERIOD_EXPIRED ||
        'Grace Period Ended - Subscription Expired',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.GRACE_PERIOD_EXPIRED,
    },
    SUBSCRIPTION_STARTED: {
      subject:
        EMAIL.SUBJECTS.SUBSCRIPTION_STARTED || 'Welcome to Your Subscription',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.SUBSCRIPTION_STARTED,
    },
    PLAN_CHANGED: {
      subject:
        EMAIL.SUBJECTS.PLAN_CHANGED || 'Your Subscription Plan Has Changed',
      template: 'subscription.template',
      icon: IMAGE_URL.SUBSCRIPTION.PLAN_CHANGED,
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
