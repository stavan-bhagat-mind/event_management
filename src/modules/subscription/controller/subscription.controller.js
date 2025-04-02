const Models = require('../../../models/index');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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
const { PRODUCT_ID } = require('../utils/subscription.constant');
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

// webhooks for verification
// const subscriptionWebhooksHandler = async (req, res) => {
//   try {
//     // Verify Apple's JWT first
//     const appleCertUrl = req.headers['x-apple-certificate-url'];
//     const appleSignature = req.headers['x-apple-signature'];

//     if (!appleCertUrl || !appleSignature) {
//       return res.status(401).send('Missing Apple headers');
//     }

//     // Get the signed payload from the notification body
//     const signedPayload = req.body.signedPayload;
//     if (!signedPayload) {
//       return res.status(400).send('Missing signedPayload');
//     }

//     // Verify the JWT
//     const decoded = await verifyAppleJWT(signedPayload, appleCertUrl);
//     if (!decoded) {
//       return res.status(401).send('Invalid signature');
//     }

//     const payload = decoded.payload;
//     console.log('Decoded payload:', payload);

//     // Extract transaction ID (new format for App Store Server Notifications v2)
//     const originalTransactionId = payload.data?.signedTransactionInfo
//       ? JSON.parse(payload.data.signedTransactionInfo).originalTransactionId
//       : payload.originalTransactionId;

//     if (!originalTransactionId) {
//       return res.status(400).json({ error: 'Missing transaction ID' });
//     }

//     const subscription = await Models.Subscription.findOne({
//       originalTransactionId,
//     }).populate('user');

//     if (!subscription) {
//       return res.status(404).json({ error: 'Subscription not found' });
//     }

//     // Handle different notification types
//     switch (payload.notificationType) {
//       case 'SUBSCRIBED':
//         await handleInitialPurchase(subscription, payload);
//         break;
//       case 'DID_RENEW':
//         await handleRenewal(subscription, payload);
//         break;
//       case 'DID_FAIL_TO_RENEW':
//         await handleFailedRenewal(subscription, payload);
//         break;
//       case 'CANCEL':
//         await handleCancellation(subscription, payload);
//         break;
//       case 'DID_CHANGE_RENEWAL_STATUS':
//         await handleRenewalStatusChange(subscription, payload);
//         break;
//       case 'EXPIRED':
//         await handleExpiration(subscription, payload);
//         break;
//       // case 'INTERACTIVE_RENEWAL':
//       //   await handleInteractiveRenewal(subscription, payload);
//       //   break;
//       // case 'PRICE_INCREASE_CONSENT':
//       //   await handlePriceIncreaseConsent(subscription, payload);
//       //   break;
//       default:
//         console.log('Unhandled notification type:', payload.notificationType);
//     }
//     // Respond to Apple immediately to acknowledge receipt
//     res.status(200).send('OK');
//   } catch (error) {
//     console.error('Webhook error:', error);
//     res.status(500).send('Internal error');
//   }
// };

// // Add this handler function with your other handlers
// const handleExpiration = async (subscription, notification) => {
//   try {
//     const latestReceiptInfo =
//       notification.unified_receipt?.latest_receipt_info?.[0];

//     // Update subscription status and expiration
//     subscription.active = false;
//     // subscription.status = 'EXPIRED';

//     if (latestReceiptInfo?.expires_date_ms) {
//       subscription.expiresDate = new Date(
//         parseInt(latestReceiptInfo.expires_date_ms)
//       );
//     } else {
//       subscription.expiresDate = new Date();
//     }

//     // additional expiration tracking
//     subscription.expirationReason = notification.expiration_reason || 'natural';
//     subscription.expiredAt = new Date();

//     await subscription.save();

//     console.log(`Subscription expired for ${subscription.user}`);
//     //  might trigger email notifications
//   } catch (error) {
//     console.error('Error handling expiration:', error);
//     throw error;
//   }
// };
// // Verify Apple JWT
// const verifyAppleJWT = async (signedPayload, appleCertUrl) => {
//   try {
//     // Fetch Apple's certificate
//     const response = await axios.get(appleCertUrl, {
//       headers: { 'User-Agent': 'Node.js' },
//     });

//     // Convert PEM certificate to public key
//     const certificate = `-----BEGIN CERTIFICATE-----\n${response.data}\n-----END CERTIFICATE-----`;
//     const publicKey = crypto.createPublicKey(certificate);

//     // Verify the JWT
//     const decoded = jwt.verify(signedPayload, publicKey, {
//       algorithms: ['ES256'],
//       complete: true,
//     });

//     return decoded;
//   } catch (error) {
//     console.error('JWT verification failed:', error);
//     return false;
//   }
// };

// // Helper functions
// const handleInitialPurchase = async (subscription, notification) => {
//   try {
//     console.log(subscription, '------------------------', notification);
//     const latestReceiptInfo =
//       notification.unified_receipt.latest_receipt_info[0];

//     // Update subscription status
//     subscription.status = 'ACTIVE';
//     subscription.expiresDate = new Date(
//       parseInt(latestReceiptInfo.expires_date_ms)
//     );
//     subscription.productId = latestReceiptInfo.product_id;

//     // If this is the first time seeing this subscription
//     if (!subscription.purchaseDate) {
//       subscription.purchaseDate = new Date(
//         parseInt(latestReceiptInfo.purchase_date_ms)
//       );
//     }

//     await subscription.save();

//     console.log(`Initial purchase processed for ${subscription.user}`);
//   } catch (error) {
//     console.error('Error handling initial purchase:', error);
//   }
// };
// // renewal
// const handleRenewal = async (subscription, notification) => {
//   try {
//     const latestReceiptInfo =
//       notification.unified_receipt.latest_receipt_info[0];

//     // Update subscription with new expiry date
//     // subscription.status = 'ACTIVE';
//     subscription.expiresDate = new Date(
//       parseInt(latestReceiptInfo.expires_date_ms)
//     );
//     subscription.renewalCount = (subscription.renewalCount || 0) + 1;

//     await subscription.save();

//     console.log(`Renewal processed for ${subscription.user}`);
//   } catch (error) {
//     console.error('Error handling renewal:', error);
//   }
// };
// // failed renewal
// const handleFailedRenewal = async (subscription, notification) => {
//   try {
//     const latestReceiptInfo =
//       notification.unified_receipt.latest_receipt_info[0];
//     const expirationDate = new Date(
//       parseInt(latestReceiptInfo.expires_date_ms)
//     );

//     // Only mark as expired if actually expired
//     if (expirationDate < new Date()) {
//       subscription.status = 'EXPIRED';
//       await subscription.save();
//       console.log(`Subscription expired for ${subscription.user}`);
//     } else {
//       console.log(
//         `Failed renewal but still within grace period for ${subscription.user}`
//       );
//     }
//   } catch (error) {
//     console.error('Error handling failed renewal:', error);
//   }
// };
// // cancellation`
// const handleCancellation = async (subscription, notification) => {
//   try {
//     console.log('subscription, notification', subscription, notification);
//     // Apple may send cancellation for various reasons
//     const cancellationDate = new Date(
//       parseInt(notification.cancellation_date_ms)
//     );

//     // subscription.status = 'CANCELLED';
//     subscription.cancellationDate = cancellationDate;
//     subscription.cancellationReason =
//       notification.cancellation_reason || 'user_cancelled';

//     await subscription.save();

//     console.log(`Cancellation processed for ${subscription.user}`);
//   } catch (error) {
//     console.error('Error handling cancellation:', error);
//   }
// };
// //renewal status change
// const handleRenewalStatusChange = async (subscription, notification) => {
//   try {
//     console.log('subscription, notification', subscription, notification);
//     const autoRenewStatus = notification.auto_renew_status === 'true';
//     const latestReceiptInfo =
//       notification.unified_receipt.latest_receipt_info[0];

//     subscription.autoRenewStatus = autoRenewStatus;

//     if (!autoRenewStatus) {
//       subscription.status = 'CANCELLED';
//       subscription.cancellationReason = 'user_turned_off_auto_renew';
//     } else {
//       // User re-enabled auto-renewal
//       subscription.status = 'ACTIVE';
//       subscription.expiresDate = new Date(
//         parseInt(latestReceiptInfo.expires_date_ms)
//       );
//     }

//     await subscription.save();

//     console.log(
//       `Renewal status changed to ${autoRenewStatus} for ${subscription.user}`
//     );
//   } catch (error) {
//     console.error('Error handling renewal status change:', error);
//   }
// };
// Get Subscription status
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
    console.log('req', req);
    console.log('req.headers', req.headers);
    const notification = req.body;
    let originalTransactionId;
    let subscription;
    console.log('Received notification:', notification);
    // ======================
    // 1. Determine Notification Type
    // ======================
    if (notification.signedPayload) {
      // V2 JWT Notification
      const decoded = await handleJWTNotification(notification.signedPayload);
      console.log('Decoded V2 Notification:', decoded);

      originalTransactionId = extractV2TransactionId(decoded);
      subscription = await findSubscription(originalTransactionId);

      // await handleV2Notification(decoded, subscription);
      await handleAnyNotification(decoded, subscription);
    } else if (notification.unified_receipt) {
      // V1 Legacy Notification
      console.log('Legacy V1 Notification:', notification);

      originalTransactionId = extractV1TransactionId(notification);
      subscription = await findSubscription(originalTransactionId);

      // await handleV1Notification(notification, subscription);
      await handleAnyNotification(notification, subscription);
    } else {
      throw new Error('Unrecognized notification format');
    }

    // ======================
    // 2. Send Response
    // ======================
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook Processing Error:', {
      error: error.message,
      stack: error.stack,
      notification: req.body,
    });
    res.status(500).send('Internal error');
  }
};

// ======================
// Helper Functions
// ======================

// JWT Handling
const handleJWTNotification = async (signedPayload) => {
  try {
    // Verify signature (recommended for production)
    const isValid = await verifyAppleJWT(signedPayload);
    if (!isValid) throw new Error('Invalid JWT signature');

    // Decode payload
    const decoded = jwt.decode(signedPayload, { complete: true });
    return decoded.payload;
  } catch (error) {
    console.error('JWT Processing Error:', error);
    throw new Error('Failed to process JWT notification');
  }
};

// Transaction ID Extractors
const extractV2TransactionId = (notification) => {
  try {
    if (notification.data?.signedTransactionInfo) {
      const transactionInfo = jwt.decode(
        notification.data.signedTransactionInfo,
        { complete: true }
      ).payload;
      return transactionInfo.originalTransactionId;
    }
    throw new Error('Missing transaction info in V2 payload');
  } catch (error) {
    console.error('V2 Transaction ID Extraction Error:', error);
    throw error;
  }
};

const extractV1TransactionId = (notification) => {
  try {
    const receiptInfo = notification.unified_receipt?.latest_receipt_info?.[0];
    if (!receiptInfo) throw new Error('Missing receipt info in V1 payload');
    return receiptInfo.original_transaction_id;
  } catch (error) {
    console.error('V1 Transaction ID Extraction Error:', error);
    throw error;
  }
};

// Database Operations
const findSubscription = async (originalTransactionId) => {
  if (!originalTransactionId) {
    throw new Error('No transaction ID provided');
  }

  const subscription = await Models.Subscription.findOne({
    originalTransactionId,
  }).populate('user');

  if (!subscription) {
    console.warn(
      'Subscription not found for transaction ID:',
      originalTransactionId
    );
    throw new Error('Subscription not found');
  }

  return subscription;
};

// ======================
// Notification Handlers
// ======================

const handleAnyNotification = async (notification, subscription) => {
  // Normalize the notification type
  const notificationType =
    notification.notificationType || notification.notification_type;

  // Normalize event names to V2 format
  const normalizedType =
    {
      SUBSCRIBED: 'INITIAL_BUY',
      DID_RENEW: 'RENEWAL',
      DID_FAIL_TO_RENEW: 'FAILED_RENEWAL',
      DID_RECOVER: 'RECOVERED',
    }[notificationType] || notificationType;

  switch (normalizedType) {
    case 'INITIAL_BUY':
      await handleInitialPurchase(subscription, notification);
      break;

    case 'RENEWAL':
      await handleRenewal(subscription, notification);
      break;

    case 'FAILED_RENEWAL':
      await handleFailedRenewal(subscription, notification);
      break;

    case 'CANCEL':
    case 'REFUND':
      await handleCancellation(subscription, notification);
      break;

    case 'EXPIRED':
      await handleExpiration(subscription, notification);
      break;

    case 'DID_CHANGE_RENEWAL_STATUS':
    case 'AUTO_RENEW_STATUS':
      await handleRenewalStatusChange(subscription, notification);
      break;

    case 'RECOVERED':
      await handleRecovery(subscription, notification);
      break;

    case 'GRACE_PERIOD_EXPIRED':
      await handleGracePeriodExpired(subscription, notification);
      break;

    default:
      console.warn(
        'Unhandled notification type:',
        normalizedType,
        'Original:',
        notificationType
      );
    // Consider logging the full notification for debugging
  }
};
// const handleV2Notification = async (notification, subscription) => {
//   const notificationType = notification.notificationType;

//   switch (notificationType) {
//     case 'SUBSCRIBED':
//     case 'INITIAL_BUY':
//       await handleInitialPurchase(subscription, notification);
//       break;

//     case 'DID_RENEW':
//     case 'RENEWAL':
//       await handleRenewal(subscription, notification);
//       break;

//     case 'DID_FAIL_TO_RENEW':
//     case 'FAILED_RENEWAL':
//       await handleFailedRenewal(subscription, notification);
//       break;

//     case 'CANCEL':
//     case 'REFUND':
//       await handleCancellation(subscription, notification);
//       break;

//     case 'EXPIRED':
//       await handleExpiration(subscription, notification);
//       break;

//     // Add other V2-specific cases as needed
//     default:
//       console.warn('Unhandled V2 notification type:', notificationType);
//   }
// };

// const handleV1Notification = async (notification, subscription) => {
//   const notificationType = notification.notification_type;

//   switch (notificationType) {
//     case 'SUBSCRIBED':
//       await handleInitialPurchase(subscription, notification);
//       break;

//     case 'DID_RENEW':
//       await handleRenewal(subscription, notification);
//       break;

//     case 'DID_FAIL_TO_RENEW':
//       await handleFailedRenewal(subscription, notification);
//       break;

//     case 'CANCEL':
//       await handleCancellation(subscription, notification);
//       break;

//     case 'EXPIRED':
//       await handleExpiration(subscription, notification);
//       break;

//     // Add other V1-specific cases as needed
//     default:
//       console.warn('Unhandled V1 notification type:', notificationType);
//   }
// };

// ======================
// Event-Specific Handlers
// ======================

const handleInitialPurchase = async (subscription, notification) => {
  try {
    const receiptInfo = getLatestReceiptInfo(notification);

    subscription.status = 'active';
    subscription.expiresDate = parseDate(receiptInfo.expires_date_ms);
    subscription.productId = receiptInfo.product_id;
    subscription.isTrial = receiptInfo.is_trial_period === 'true';

    if (!subscription.purchaseDate) {
      subscription.purchaseDate = parseDate(receiptInfo.purchase_date_ms);
    }

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'active');

    console.log(`Initial purchase processed for ${subscription.user._id}`);
  } catch (error) {
    console.error('Initial Purchase Handling Error:', error);
    throw error;
  }
};

const handleRenewal = async (subscription, notification) => {
  try {
    const receiptInfo = getLatestReceiptInfo(notification);

    subscription.status = 'active';
    subscription.expiresDate = parseDate(receiptInfo.expires_date_ms);
    subscription.renewalCount = (subscription.renewalCount || 0) + 1;
    subscription.autoRenewStatus = true;

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'active');

    console.log(`Renewal processed for ${subscription.user._id}`);
  } catch (error) {
    console.error('Renewal Handling Error:', error);
    throw error;
  }
};

const handleFailedRenewal = async (subscription, notification) => {
  try {
    const receiptInfo = getLatestReceiptInfo(notification);
    const expirationDate = parseDate(receiptInfo.expires_date_ms);

    if (expirationDate < new Date()) {
      subscription.status = 'expired';
      subscription.expirationReason = 'payment_failed';
      await subscription.save();
      await updateUserSubscriptionStatus(subscription.user._id, 'expired');
      console.log(
        `Subscription expired for ${subscription.user._id} (payment failed)`
      );
    } else {
      subscription.status = 'grace_period';
      await subscription.save();
      console.log(
        `Payment failed but in grace period for ${subscription.user._id}`
      );

      // Optional: Trigger email notification about payment failure
      await sendPaymentFailureEmail(subscription.user.email, {
        retry_until: expirationDate,
        amount: receiptInfo.price,
        product: receiptInfo.product_id,
      });
    }
  } catch (error) {
    console.error('Failed Renewal Handling Error:', error);
    throw error;
  }
};

const handleCancellation = async (subscription, notification) => {
  try {
    subscription.status = 'canceled';
    subscription.cancellationDate = notification.cancellation_date
      ? new Date(notification.cancellation_date)
      : new Date();

    subscription.cancellationReason =
      notification.cancellation_reason || 'user_cancelled';
    subscription.autoRenewStatus = false;

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'canceled');

    console.log(`Cancellation processed for ${subscription.user._id}`);

    // Optional: Send cancellation confirmation
    if (notification.cancellation_reason !== 'billing_error') {
      await sendCancellationEmail(subscription.user.email, {
        effective_date: subscription.expiresDate,
        reason: subscription.cancellationReason,
      });
    }
  } catch (error) {
    console.error('Cancellation Handling Error:', error);
    throw error;
  }
};

const handleExpiration = async (subscription, notification) => {
  try {
    subscription.status = 'expired';
    subscription.expirationReason = notification.expiration_reason || 'natural';
    subscription.expiredAt = new Date();

    if (
      notification.unified_receipt?.latest_receipt_info?.[0]?.expires_date_ms
    ) {
      subscription.expiresDate = parseDate(
        notification.unified_receipt.latest_receipt_info[0].expires_date_ms
      );
    }

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'expired');

    console.log(`Subscription expired for ${subscription.user._id}`);

    // Optional: Send expiration notice
    await sendExpirationEmail(subscription.user.email, {
      product: subscription.productId,
      renewal_available: false,
    });
  } catch (error) {
    console.error('Expiration Handling Error:', error);
    throw error;
  }
};

const handleRenewalStatusChange = async (subscription, notification) => {
  try {
    const autoRenewStatus = notification.auto_renew_status === 'true';
    subscription.autoRenewStatus = autoRenewStatus;

    if (!autoRenewStatus) {
      subscription.status = 'canceled';
      subscription.cancellationReason = 'auto_renew_disabled';
    } else {
      subscription.status = 'active';
      const receiptInfo = getLatestReceiptInfo(notification);
      if (receiptInfo?.expires_date_ms) {
        subscription.expiresDate = parseDate(receiptInfo.expires_date_ms);
      }
    }

    await subscription.save();
    await updateUserSubscriptionStatus(
      subscription.user._id,
      subscription.status
    );

    console.log(
      `Renewal status changed to ${autoRenewStatus} for ${subscription.user._id}`
    );

    // Optional: Send status change notification
    await sendRenewalStatusEmail(subscription.user.email, {
      auto_renew: autoRenewStatus,
      next_billing_date: subscription.expiresDate,
    });
  } catch (error) {
    console.error('Renewal Status Change Handling Error:', error);
    throw error;
  }
};

const handleRecovery = async (subscription, notification) => {
  try {
    const receiptInfo = getLatestReceiptInfo(notification);

    subscription.status = 'active';
    subscription.expiresDate = parseDate(receiptInfo.expires_date_ms);
    subscription.autoRenewStatus = true;
    subscription.recoveryDate = new Date();

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'active');

    console.log(`Subscription recovered for ${subscription.user._id}`);

    // Optional: Send recovery confirmation
    await sendRecoveryEmail(subscription.user.email, {
      recovered_at: new Date(),
      next_billing_date: subscription.expiresDate,
    });
  } catch (error) {
    console.error('Recovery Handling Error:', error);
    throw error;
  }
};

const handleGracePeriodExpired = async (subscription, notification) => {
  try {
    subscription.status = 'expired';
    subscription.expirationReason = 'grace_period_ended';
    subscription.expiredAt = new Date();

    await subscription.save();
    await updateUserSubscriptionStatus(subscription.user._id, 'expired');

    console.log(`Grace period expired for ${subscription.user._id}`);

    // Optional: Send final expiration notice
    await sendGracePeriodExpiredEmail(subscription.user.email, {
      product: subscription.productId,
      last_active_date: subscription.expiresDate,
    });
  } catch (error) {
    console.error('Grace Period Expired Handling Error:', error);
    throw error;
  }
};

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

// ======================
// Utility Functions
// ======================

const getLatestReceiptInfo = (notification) => {
  if (notification.unified_receipt?.latest_receipt_info) {
    return notification.unified_receipt.latest_receipt_info[0];
  }
  if (notification.data?.signedTransactionInfo) {
    return jwt.decode(notification.data.signedTransactionInfo, {
      complete: true,
    }).payload;
  }
  throw new Error('No receipt information found');
};

const parseDate = (timestamp) => {
  return timestamp ? new Date(parseInt(timestamp)) : null;
};

const updateUserSubscriptionStatus = async (userId, status) => {
  const isSubscribed = ['active', 'trial'].includes(status);

  await Models.User.findByIdAndUpdate(userId, {
    isSubscribed,
    ...(isSubscribed && { $setOnInsert: { subscription: subscription._id } }),
  });
};

const verifyAppleJWT = async (signedPayload) => {
  try {
    // 1. Decode without verification to get header
    const decoded = jwt.decode(signedPayload, { complete: true });
    if (!decoded?.header) {
      throw new Error('Invalid JWT structure');
    }

    // 2. Get Apple's public key
    const applePublicKeys = await fetchApplePublicKeys();
    const publicKey = findMatchingPublicKey(decoded.header, applePublicKeys);

    if (!publicKey) {
      throw new Error('No matching public key found');
    }

    // 3. Convert JWK to PEM format
    const pem = jwkToPem(publicKey);

    // 4. Verify the signature
    jwt.verify(signedPayload, pem, {
      algorithms: ['ES256'],
      complete: true,
    });

    return true;
  } catch (error) {
    console.error('JWT Verification Failed:', error.message);
    return false;
  }
};

// Fetch Apple's public keys
const fetchApplePublicKeys = async () => {
  const response = await axios.get('https://appleid.apple.com/auth/keys');
  return response.data.keys;
};

// Find the key that matches the JWT header
const findMatchingPublicKey = (header, keys) => {
  return keys.find((key) => key.kid === header.kid && key.alg === header.alg);
};

// Helper to verify the JWT's timestamp
const verifyTokenTimestamps = (decoded) => {
  const now = Math.floor(Date.now() / 1000);
  if (decoded.payload.exp && decoded.payload.exp < now) {
    throw new Error('Token expired');
  }
  if (decoded.payload.iat && decoded.payload.iat > now) {
    throw new Error('Token issued in future');
  }
};

// -----------------------
module.exports = {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
  // appleServerNotificationHandler,
};
