const Models = require('../../../models/index');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const jws = require('jws');
const {
  successResponseData,
  errorResponseData,
  errorResponseWithoutData,
  validationErrorResponseData,
  successResponseWithoutData,
} = require('../../../utils/response');
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  INACTIVE_USER,
  MSG_NO_CHANGES_MADE,
} = require('../../../utils/common/messages');
const {
  CATEGORY,
  ROLE,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
} = require('../../../utils/common/constants');
const FileService = require('../../../services/file.service');
const { verifyJWS, verifyLegacyReceipt } = require('../../../helpers/helper');
const {
  PRODUCT_ID,
  NOTIFICATION_TYPES,
} = require('../utils/subscription.constant');
const {
  SUBSCRIPTION_SUCCESSFULLY_VALIDATED,
} = require('../utils/subscription.messages');
const axios = require('axios');
// const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// validation receipt
const validateReceiptHandler = async (req, res) => {
  try {
    const { receipt, jws, isSandbox } = req.body;
    const userId = req.userId;
    let result;
    if (jws) {
      // StoreKit 2 JWS validation
      result = await verifyJWS(jws);
    } else if (receipt) {
      // Legacy receipt validation
      result = await verifyLegacyReceipt(receipt, isSandbox, userId);
    } else {
      return res.status(400).json({ error: 'Missing receipt data' });
    }

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      SUBSCRIPTION_SUCCESSFULLY_VALIDATED
    );
  } catch (error) {
    console.error(`validateReceiptHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      // MSG_INTERNAL_SERVER_ERROR
      error.message
    );
  }
};

const getSubscriptionStatusHandler = async (req, res) => {
  try {
    // const { userId } = req.params;
    const userId = req.userId;

    const subscription = await Models.Subscription.findOne({
      userId,
      status: 'active',
      expiresDate: { $gt: new Date() },
    }).sort({ expiresDate: -1 });

    if (!subscription) {
      return successResponseData(
        res,
        { hasActiveSubscription: false },
        STATUS_SUCCESS,
        COMMON_MSG.FETCHED_SUCCESS.replace('##', 'subscription status')
      );
    }

    return successResponseData(
      res,
      {
        hasActiveSubscription: true,
        productId: subscription.productId,
        expiresDate: subscription.expiresDate,
      },
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', 'subscription status')
    );
  } catch (error) {
    console.error(`getSubscriptionStatusHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

// -----------------------------------------------------------------------

// Webhook handler for App Store Server Notifications
const subscriptionWebhooksHandler = async (req, res) => {
  try {
    console.log('Received App Store notification');
    console.log('req', req);
    console.log('req.headers', req.headers);
    console.log('req.body', req.body);

    // Get the signed payload (JWS) from the request body
    const signedPayload = req.body.signedPayload;

    if (!signedPayload) {
      console.error('No signedPayload in request body');
      return res.status(400).json({ error: 'Missing signedPayload' });
    }

    try {
      // Verify and decode the JWS
      const decodedPayload = await verifyAndDecodeSignature(signedPayload);
      console.log('Decoded payload:', decodedPayload);

      // Process the notification based on its type
      await processNotification(decodedPayload);

      // Always respond with 200 OK to acknowledge receipt
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing signedPayload:', error);
      // Still return 200 to prevent Apple from retrying
      // Log the error for your analysis
      return res.status(200).json({ received: true, error: error.message });
    }
  } catch (error) {
    console.error('Webhook Processing Error:', {
      error: error.message,
      stack: error.stack,
      notification: req.body,
    });
    res.status(500).send('Internal error');
  }
};
// Function to verify and decode the JWS signature using jws library
const verifyAndDecodeSignature = async (signedPayload) => {
  try {
    // Decode the JWS without verification first
    const decoded = jws.decode(signedPayload);

    console.log('Decoded JWS:', decoded);

    if (!decoded) {
      throw new Error('Invalid JWS format');
    }

    // Extract the header and verify it contains the necessary certificate info
    const header = decoded.header;
    console.log('Header:', header);
    if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
      throw new Error('Missing certificate chain in JWS header');
    }

    // Get the certificate from the header
    const certPem = formatPemCertificate(header.x5c[0]);
    console.log('Certificate PEM:', certPem);
    // In production, verify the cert chain back to Apple's root CA
    // For now, just verify the signature using the provided cert
    const verified = jws.verify(signedPayload, header.alg, certPem);

    if (!verified) {
      throw new Error('JWS signature verification failed');
    }

    // Parse the payload
    const payload = JSON.parse(decoded.payload);
    console.log('Payload:', payload);
    return payload;
  } catch (error) {
    console.error('Error verifying and decoding signature:', error);
    throw new Error(`Invalid signature: ${error.message}`);
  }
};

// Helper to format a base64 certificate as PEM
const formatPemCertificate = (certBase64) => {
  const pemCert =
    '-----BEGIN CERTIFICATE-----\n' +
    certBase64.match(/.{1,64}/g).join('\n') +
    '\n-----END CERTIFICATE-----';
  return pemCert;
};

// Function to process notifications based on type
const processNotification = async (decodedPayload) => {
  const notificationType = decodedPayload.notificationType;
  const subtype = decodedPayload.subtype;
  const data = decodedPayload.data;

  console.log(
    `Processing notification type: ${notificationType}, subtype: ${subtype}`
  );

  switch (notificationType) {
    case NOTIFICATION_TYPES.SUBSCRIBED:
      await handleNewSubscription(data);
      break;
    case NOTIFICATION_TYPES.DID_RENEW:
      await handleRenewal(data);
      break;
    case NOTIFICATION_TYPES.DID_FAIL_TO_RENEW:
      await handleFailedRenewal(data);
      break;
    case NOTIFICATION_TYPES.EXPIRED:
      await handleExpiration(data);
      break;
    case NOTIFICATION_TYPES.REVOKE:
      await handleRevocation(data);
      break;
    case NOTIFICATION_TYPES.REFUND:
      await handleRefund(data);
      break;
    // Add other notification types as needed
    default:
      console.log(`Unhandled notification type: ${notificationType}`);
      // Store the notification for analysis
      await storeRawNotification(decodedPayload);
  }
};

// Handler for NEW subscription
async function handleNewSubscription(data) {
  try {
    const { signedTransactionInfo, appAppleId, bundleId, environment } = data;

    console.log('Received new subscription data:', data);
    // Verify and decode the transaction information
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );
    const {
      originalTransactionId,
      productId,
      purchaseDate,
      expiresDate,
      offerType,
    } = transactionInfo;

    // Find user by Apple ID (email)
    const user = await Models.User.findOne({
      email: appAppleId.toLowerCase().trim(),
    });

    if (!user) {
      throw new Error(`User not found with email: ${appAppleId}`);
    }

    // Create/update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        user: user._id,
        originalTransactionId,
        productId,
        purchaseDate: new Date(purchaseDate),
        expiresDate: new Date(expiresDate),
        isActive: true,
        autoRenewStatus: true,
        environment,
        status: 'active',
        isTrial: offerType === 'TRIAL',
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    // Update user's subscription status
    await Models.User.findByIdAndUpdate(user._id, {
      isSubscribed: true,
      subscription: subscription._id,
    });

    console.log(`Processed subscription ${subscription._id} for ${appAppleId}`);
    return subscription;
  } catch (error) {
    console.error('Subscription processing failed:', error);
    throw error; // Propagate error for upstream handling
  }
}

// Handler for subscription RENEWAL
async function handleRenewal(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId, transactionId, expiresDate } =
      transactionInfo;

    // Update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        expiresDate: new Date(expiresDate),
        isActive: true,
        status: 'active',
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for renewal: ${originalTransactionId}`
      );
      return;
    }

    // Update user subscription status
    await Models.User.findByIdAndUpdate(subscription.user, {
      isSubscribed: true,
    });

    console.log(`Subscription renewed: ${originalTransactionId}`);
  } catch (error) {
    console.error('Error processing renewal:', error);
    throw error;
  }
}

// Handler for RENEWAL STATUS CHANGE (auto-renew on/off)
async function handleRenewalStatusChange(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId, autoRenewStatus } = transactionInfo;

    // Update subscription
    await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        autoRenewStatus: !!autoRenewStatus,
        'pendingRenewalInfo.autoRenewStatus': !!autoRenewStatus,
        lastVerified: new Date(),
      }
    );

    console.log(
      `Subscription auto-renewal changed to ${autoRenewStatus} for: ${originalTransactionId}`
    );
  } catch (error) {
    console.error('Error processing renewal status change:', error);
    throw error;
  }
}

// Handler for FAILED RENEWAL
async function handleFailedRenewal(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId, expiresDate, gracePeriodExpiresDate } =
      transactionInfo;

    // Update subscription to grace period
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        status: 'past_due',
        expiresDate: new Date(expiresDate),
        gracePeriodExpiresDate: gracePeriodExpiresDate
          ? new Date(gracePeriodExpiresDate)
          : null,
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for failed renewal: ${originalTransactionId}`
      );
      return;
    }

    console.log(`Failed renewal for: ${originalTransactionId}`);

    // Optionally notify user about billing issue
    // notifyUserAboutBillingIssue(subscription.user);
  } catch (error) {
    console.error('Error processing failed renewal:', error);
    throw error;
  }
}

// Handler for EXPIRATION
async function handleExpiration(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId } = transactionInfo;

    // Update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        status: 'expired',
        isActive: false,
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for expiration: ${originalTransactionId}`
      );
      return;
    }

    // Update user subscription status
    await Models.User.findByIdAndUpdate(subscription.user, {
      isSubscribed: false,
    });

    console.log(`Subscription expired: ${originalTransactionId}`);
  } catch (error) {
    console.error('Error processing expiration:', error);
    throw error;
  }
}

// Handler for GRACE PERIOD EXPIRED
async function handleGracePeriodExpired(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId } = transactionInfo;

    // Update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        status: 'expired',
        isActive: false,
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for grace period expiration: ${originalTransactionId}`
      );
      return;
    }

    // Update user subscription status
    await Models.User.findByIdAndUpdate(subscription.user, {
      isSubscribed: false,
    });

    console.log(
      `Grace period expired for subscription: ${originalTransactionId}`
    );
  } catch (error) {
    console.error('Error processing grace period expiration:', error);
    throw error;
  }
}

// Handler for REVOCATION
async function handleRevocation(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId, revocationDate } = transactionInfo;

    // Update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        status: 'canceled',
        isActive: false,
        cancellationReason: 'revoked',
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for revocation: ${originalTransactionId}`
      );
      return;
    }

    // Update user subscription status
    await Models.User.findByIdAndUpdate(subscription.user, {
      isSubscribed: false,
    });

    console.log(`Subscription revoked: ${originalTransactionId}`);
  } catch (error) {
    console.error('Error processing revocation:', error);
    throw error;
  }
}

// Handler for REFUND
async function handleRefund(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId } = transactionInfo;

    // Update subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        status: 'canceled',
        isActive: false,
        cancellationReason: 'refunded',
        lastVerified: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      console.error(
        `No subscription found for refund: ${originalTransactionId}`
      );
      return;
    }

    // Update user subscription status
    await Models.User.findByIdAndUpdate(subscription.user, {
      isSubscribed: false,
    });

    console.log(`Refund processed for: ${originalTransactionId}`);
  } catch (error) {
    console.error('Error processing refund:', error);
    throw error;
  }
}

// Helper to store raw notifications for debugging
async function storeRawNotification(notification) {
  // This could be implemented with a separate collection if needed
  console.log('Storing raw notification for analysis', notification);
}
// ======================
// Email Notification Helpers (Example Implementations)
// ======================
  
const sendPaymentFailureEmail = async (email, data) => {
  // Implement your email service integration
  console.log(`[Email] Payment failure notice sent to ${email}`, data);
};

const sendCancellationEmail = async (email, data) => {
  console.log(`[Email] Cancellation confirmation sent to ${email}`, data);
};

const sendExpirationEmail = async (email, data) => {
  console.log(`[Email] Subscription expired notice sent to ${email}`, data);
};

const sendRenewalStatusEmail = async (email, data) => {
  console.log(`[Email] Renewal status update sent to ${email}`, data);
};

const sendRecoveryEmail = async (email, data) => {
  console.log(`[Email] Subscription recovery notice sent to ${email}`, data);
};

const sendGracePeriodExpiredEmail = async (email, data) => {
  console.log(`[Email] Grace period ended notice sent to ${email}`, data);
};
// -----------------------
module.exports = {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
  // appleServerNotificationHandler,
};
