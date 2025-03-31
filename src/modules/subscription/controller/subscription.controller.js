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
const subscriptionWebhooksHandler = async (req, res) => {
  try {
    // Important: Apple sends the data as raw body, not JSON
    const rawBody = req.body.toString('utf8');
    const notification = JSON.parse(rawBody);
    console.log(notification);
    // More robust signature verification
    const appleCertUrl = req.headers['x-apple-certificate-url'];
    const appleSignature = req.headers['x-apple-signature'];

    if (!verifyAppleSignature(rawBody, appleCertUrl, appleSignature)) {
      return res.status(401).send('Invalid signature');
    }

    const originalTransactionId =
      notification.unified_receipt?.latest_receipt_info?.[0]
        ?.original_transaction_id ||
      notification.unified_receipt?.latest_receipt_info
        ?.original_transaction_id;
    console.log(originalTransactionId);
    if (!originalTransactionId) {
      return res.status(400).json({ error: 'Missing transaction ID' });
    }

    const subscription = await Models.Subscription.findOne({
      originalTransactionId,
    }).populate('user');

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Handle different notification types
    switch (notification.notification_type) {
      case 'INITIAL_BUY':
        await handleInitialPurchase(subscription, notification);
        break;
      case 'DID_RENEW':
        await handleRenewal(subscription, notification);
        break;
      case 'DID_FAIL_TO_RENEW':
        await handleFailedRenewal(subscription, notification);
        break;
      case 'CANCEL':
        await handleCancellation(subscription, notification);
        break;
      case 'DID_CHANGE_RENEWAL_STATUS':
        await handleRenewalStatusChange(subscription, notification);
        break;
      // case 'INTERACTIVE_RENEWAL':
      //   await handleInteractiveRenewal(subscription, notification);
      //   break;
      // case 'PRICE_INCREASE_CONSENT':
      //   await handlePriceIncreaseConsent(subscription, notification);
      //   break;
      default:
        console.log(
          'Unhandled notification type:',
          notification.notification_type
        );
    }

    // Always send 200 to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).send('Internal error');
  }
};
// Signature verification function
async function verifyAppleSignature(rawBody, appleCertUrl, appleSignature) {
  try {
    const response = await axios.get(appleCertUrl);
    const appleCertificate = response.data;
    const verifier = crypto.createVerify('sha1');
    verifier.update(rawBody, 'utf8');
    return verifier.verify(appleCertificate, appleSignature, 'base64');
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
// Helper functions
const handleInitialPurchase = async (subscription, notification) => {
  try {
    console.log(subscription, '------------------------', notification);
    const latestReceiptInfo =
      notification.unified_receipt.latest_receipt_info[0];

    // Update subscription status
    subscription.status = 'ACTIVE';
    subscription.expiresDate = new Date(
      parseInt(latestReceiptInfo.expires_date_ms)
    );
    subscription.productId = latestReceiptInfo.product_id;

    // If this is the first time seeing this subscription
    if (!subscription.purchaseDate) {
      subscription.purchaseDate = new Date(
        parseInt(latestReceiptInfo.purchase_date_ms)
      );
    }

    await subscription.save();

    console.log(`Initial purchase processed for ${subscription.user}`);
  } catch (error) {
    console.error('Error handling initial purchase:', error);
  }
};
// renewal
const handleRenewal = async (subscription, notification) => {
  try {
    const latestReceiptInfo =
      notification.unified_receipt.latest_receipt_info[0];

    // Update subscription with new expiry date
    subscription.status = 'ACTIVE';
    subscription.expiresDate = new Date(
      parseInt(latestReceiptInfo.expires_date_ms)
    );
    subscription.renewalCount = (subscription.renewalCount || 0) + 1;

    await subscription.save();

    console.log(`Renewal processed for ${subscription.user}`);
  } catch (error) {
    console.error('Error handling renewal:', error);
  }
};
// failed renewal
const handleFailedRenewal = async (subscription, notification) => {
  try {
    const latestReceiptInfo =
      notification.unified_receipt.latest_receipt_info[0];
    const expirationDate = new Date(
      parseInt(latestReceiptInfo.expires_date_ms)
    );

    // Only mark as expired if actually expired
    if (expirationDate < new Date()) {
      subscription.status = 'EXPIRED';
      await subscription.save();
      console.log(`Subscription expired for ${subscription.user}`);
    } else {
      console.log(
        `Failed renewal but still within grace period for ${subscription.user}`
      );
    }
  } catch (error) {
    console.error('Error handling failed renewal:', error);
  }
};
// cancellation`
const handleCancellation = async (subscription, notification) => {
  try {
    // Apple may send cancellation for various reasons
    const cancellationDate = new Date(
      parseInt(notification.cancellation_date_ms)
    );

    subscription.status = 'CANCELLED';
    subscription.cancellationDate = cancellationDate;
    subscription.cancellationReason =
      notification.cancellation_reason || 'user_cancelled';

    await subscription.save();

    console.log(`Cancellation processed for ${subscription.user}`);
  } catch (error) {
    console.error('Error handling cancellation:', error);
  }
};
//renewal status change
const handleRenewalStatusChange = async (subscription, notification) => {
  try {
    const autoRenewStatus = notification.auto_renew_status === 'true';
    const latestReceiptInfo =
      notification.unified_receipt.latest_receipt_info[0];

    subscription.autoRenewStatus = autoRenewStatus;

    if (!autoRenewStatus) {
      subscription.status = 'CANCELLED';
      subscription.cancellationReason = 'user_turned_off_auto_renew';
    } else {
      // User re-enabled auto-renewal
      subscription.status = 'ACTIVE';
      subscription.expiresDate = new Date(
        parseInt(latestReceiptInfo.expires_date_ms)
      );
    }

    await subscription.save();

    console.log(
      `Renewal status changed to ${autoRenewStatus} for ${subscription.user}`
    );
  } catch (error) {
    console.error('Error handling renewal status change:', error);
  }
};

// -----------------------------------------------------------------------
// Get All Booking List
const getSubscriptionStatusHandler = async (req, res) => {
  try {
    const { userId } = req.params;

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

// Get Booking details,(Manager)
const appleServerNotificationHandler = async (req, res) => {
  try {
    const notificationData = req.body;

    // Respond to Apple immediately to acknowledge receipt
    res.status(200).send();

    // Process the notification asynchronously
    const notificationType = notificationData.notification_type;
    const unifiedReceipt = notificationData.unified_receipt;

    if (!unifiedReceipt || !unifiedReceipt.latest_receipt_info) {
      console.error('Invalid notification format');
      return;
    }

    const latestReceiptInfo = unifiedReceipt.latest_receipt_info[0];

    switch (notificationType) {
      case 'INITIAL_BUY':
      case 'INTERACTIVE_RENEWAL':
      case 'DID_RECOVER':
        // Subscription started or renewed
        await updateSubscriptionStatus(
          latestReceiptInfo.original_transaction_id,
          'active',
          latestReceiptInfo
        );
        break;

      case 'CANCEL':
        // Subscription was cancelled
        await updateSubscriptionStatus(
          latestReceiptInfo.original_transaction_id,
          'cancelled',
          latestReceiptInfo
        );
        break;

      case 'EXPIRED':
        // Subscription expired
        await updateSubscriptionStatus(
          latestReceiptInfo.original_transaction_id,
          'expired',
          latestReceiptInfo
        );
        break;
    }
  } catch (error) {
    console.error(`getBookingDetails error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

// Helper function to update subscription status
async function updateSubscriptionStatus(
  originalTransactionId,
  status,
  receiptInfo
) {
  await Subscription.findOneAndUpdate(
    { originalTransactionId },
    {
      status,
      expiresDate: new Date(parseInt(receiptInfo.expires_date_ms)),
      latestReceipt: receiptInfo,
    }
  );
}
// -----------------------
module.exports = {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
  appleServerNotificationHandler,
};
