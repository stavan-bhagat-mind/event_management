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
const { verifyReceipt } = require('../../../helpers/helper');

// async function validateReceiptHandler(req, res) {
//   try {
//     const { signedPayload } = req.body;

//     // Step 1: Decode the JWS (without verification yet)
//     const decodedPayload = jwt.decode(signedPayload, { complete: true });

//     if (!decodedPayload) {
//       return res.status(400).json({ error: 'Invalid JWS payload' });
//     }

//     // Step 2: Get Apple's public key to verify the signature
//     const keyId = decodedPayload.header.kid;
//     const applePublicKey = await fetchApplePublicKey(keyId);

//     // Step 3: Verify the signature using Apple's public key
//     const verified = jwt.verify(signedPayload, applePublicKey, {
//       algorithms: ['ES256'],
//     });

//     // Step 4: Process the verified data
//     const { originalAppVersion, receiptType, appAppleId, bundleId } = verified;

//     // Check if this is a valid app install
//     if (receiptType !== 'Production' && receiptType !== 'ProductionVPP') {
//       // For production apps, implement additional checks here
//     }

//     // Save or update user information
//     await User.findOneAndUpdate(
//       { userId: verified.userId },
//       {
//         userId: verified.userId,
//         appTransactionId: verified.transactionId,
//         originalAppVersion,
//         verified: true,
//       },
//       { upsert: true }
//     );

//     res.json({ success: true });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Verification failed' });
//   }
// }
const validateReceiptHandler = async (req, res) => {
  const { receiptData, userId } = req.body;

  if (!receiptData || !userId) {
    return res
      .status(400)
      .json({ success: false, error: 'Missing receipt data or user ID' });
  }

  try {
    // Determine environment (sandbox/production)
    // You might want to adjust this logic based on your requirements
    const isSandbox = process.env.NODE_ENV !== 'production';
    const result = await verifyReceipt(receiptData, isSandbox);
    console.log('receipt data', result);
    if (result.status === 0) {
      const latestReceiptInfo = result.latest_receipt_info;

      if (!latestReceiptInfo || latestReceiptInfo.length === 0) {
        return res
          .status(400)
          .json({ success: false, error: 'No subscription information found' });
      }

      // Sort receipts by expiration date (descending)
      const sortedReceipts = latestReceiptInfo.sort((a, b) => {
        return parseInt(b.expires_date_ms) - parseInt(a.expires_date_ms);
      });

      const latestReceipt = sortedReceipts[0];

      // Check if subscription is still valid
      const expiresDateMs = parseInt(latestReceipt.expires_date_ms);
      const isActive = expiresDateMs > Date.now();

      // Determine status based on Apple receipt data
      let status = isActive ? 'ACTIVE' : 'EXPIRED';

      // Check for trial period
      const isTrialPeriod = latestReceipt.is_trial_period === 'true';

      // Check auto-renew status if available
      const autoRenewStatus =
        result.pending_renewal_info?.[0]?.auto_renew_status === '1';

      // Update or create subscription in database
      await Subscription.findOneAndUpdate(
        { originalTransactionId: latestReceipt.original_transaction_id },
        {
          userId,
          originalTransactionId: latestReceipt.original_transaction_id,
          productId: latestReceipt.product_id,
          purchaseDate: new Date(parseInt(latestReceipt.purchase_date_ms)),
          expiresDate: new Date(expiresDateMs),
          status,
          receiptData,
          latestReceipt: result.latest_receipt,
          isTrialPeriod,
          autoRenewStatus,
          environment: isSandbox ? 'sandbox' : 'production',
        },
        { upsert: true, new: true }
      );

      return successResponseData(
        res,
        {
          isActive,
          expiresDate: new Date(expiresDateMs),
          productId: latestReceipt.product_id,
        },
        STATUS_SUCCESS,
        COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Booking')
      );
    } else {
      return res.status(400).json({ success: false, error: 'Invalid receipt' });
    }
  } catch (error) {
    console.error(`validateReceiptHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

async function fetchApplePublicKey(keyId) {
  // Fetch Apple's public keys from their endpoint
  const response = await fetch('https://apps.apple.com/verificationkeys');
  const keys = await response.json();

  // Find the matching key by ID
  const matchingKey = keys.keys.find((key) => key.kid === keyId);

  if (!matchingKey) {
    throw new Error('No matching Apple public key found');
  }

  // Convert the JWK to a format that can be used by the jwt library
  // This part depends on your JWT library's capabilities
  return convertJWKToPEM(matchingKey);
}

// Helper function to convert JWK to PEM format
function convertJWKToPEM(jwk) {
  // Implementation depends on your library
  // Many JWT libraries provide this functionality
  // For example, with the 'jwk-to-pem' package:
  // return jwkToPem(jwk);
}
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
      return res.json({ hasActiveSubscription: false });
    }

    return successResponseData(
      res,
      {
        hasActiveSubscription: true,
        productId: subscription.productId,
        expiresDate: subscription.expiresDate,
      },
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Booking')
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
  getSubscriptionStatusHandler,
  appleServerNotificationHandler,
};
