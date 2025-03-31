const crypto = require('crypto');
require('dotenv').config();
const Models = require('../models/index');

const generateOTP = (length = 6) => {
  // Generate a random  OTP
  return crypto.randomInt(100000, 999999).toString();

  //   Generate alphanumeric token
  //   return crypto.randomBytes(32).toString('hex');
};

const QRCode = require('qrcode');
const generateQRCode = async (data) => {
  try {
    const qrCode = await QRCode.toDataURL(data);
    return qrCode;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

// Utility function to extract object path from full URL
const getObjectPathFromUrl = (url) => {
  const baseUrl = process.env.MINIO_PUBLIC_URL;
  const bucketName = process.env.MINIO_BUCKET;
  return url.replace(`${baseUrl}/${bucketName}/`, '');
};

// Utility function to construct full URL from object path
const getFullImageUrl = (objectPath) => {
  const baseUrl = process.env.MINIO_PUBLIC_URL;
  const bucketName = process.env.MINIO_BUCKET;
  return `${baseUrl}/${bucketName}/${objectPath}`;
};

// Function to generate a secure verification token
const generateVerificationToken = (bookingId) => {
  const crypto = require('crypto');
  const randomString = crypto.randomBytes(16).toString('hex');
  return `${bookingId}-${randomString}`;
};
// verifyReceipt function to verify the receipt data from Apple
const axios = require('axios');
require('dotenv').config();

const verifyReceipt = async (receiptData, isSandbox = true) => {
  const endpoint = isSandbox
    ? process.env.APPLE_ENDPOINT_SANDBOX
    : process.env.APPLE_ENDPOINT_PRODUCTION;

  const payload = {
    'receipt-data': receiptData,
    password: process.env.APP_SHARED_SECRET,
    'exclude-old-transactions': true,
  };
  console.log('endpoint', endpoint);
  console.log(process.env.APP_SHARED_SECRET);
  console.log('Sending payload:', {
    ...payload,
    'receipt-data': payload['receipt-data'].substring(0, 20) + '...', // Only log a preview
  });
  console.log('Receipt data length:', receiptData.length);
  console.log(
    'Receipt data format check:',
    /^[A-Za-z0-9+/=]+$/.test(receiptData)
  );
  try {
    const { data } = await axios.post(endpoint, JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return data;
  } catch (error) {
    console.error('Error verifying receipt:', error);
    throw error;
  }
};

const jwt = require('jsonwebtoken');
// const axios = require('axios');
// const crypto = require('crypto-js');

// Configuration
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
const BUNDLE_ID = process.env.APPLE_BUNDLE_ID;

// Legacy Receipt Validation
// async function verifyLegacyReceipt(receiptData, isSandbox = true) {
//   const verificationURL = isSandbox
//     ? 'https://sandbox.itunes.apple.com/verifyReceipt'
//     : 'https://buy.itunes.apple.com/verifyReceipt';

//   const requestData = {
//     'receipt-data': receiptData,
//     password: APPLE_SHARED_SECRET,
//     'exclude-old-transactions': true,
//   };
//   console.log('requestData', requestData);
//   const decodedString = Buffer.from(receiptData, 'base64').toString('utf-8');
//   console.log(decodedString);

//   try {
//     const response = await axios.post(verificationURL, requestData);
//     console.log('first', response.data);
//     // Handle test receipts sent to production
//     if (response.data.status === 21007) {
//       const sandboxResponse = await verifyLegacyReceipt(receiptData, true);
//       console.log('Sandbox response:', sandboxResponse);
//       return sandboxResponse;
//     }
//     console.log(response.data);
//     // Validate bundle ID
//     if (response.data.receipt?.bundle_id !== BUNDLE_ID) {
//       throw new Error('Invalid bundle ID in receipt');
//     }

//     return {
//       status: response.data.status,
//       environment: isSandbox ? 'Sandbox' : 'Production',
//       receipt: response.data.receipt,
//       latestReceiptInfo: response.data.latest_receipt_info,
//       pendingRenewalInfo: response.data.pending_renewal_info,
//     };
//   } catch (error) {
//     console.error('Receipt verification failed:', error);
//     throw new Error(`Receipt verification failed: ${error.message}`);
//   }
// }

async function verifyLegacyReceipt(receiptData, isSandbox = false, userId) {
  const verificationURL = isSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  try {
    const response = await axios.post(verificationURL, {
      'receipt-data': receiptData,
      password: process.env.APPLE_SHARED_SECRET,
      'exclude-old-transactions': false,
    });

    // Handle sandbox/production mismatch
    if (response.data.status === 21007) {
      return await verifyLegacyReceipt(receiptData, true, userId);
    }
    if (response.data.status === 21008) {
      return await verifyLegacyReceipt(receiptData, false, userId);
    }
    if (response.data.status !== 0) {
      throw new Error(
        `Receipt validation failed with status: ${response.data.status}`
      );
    }

    // Process valid receipt
    const receipt = response.data;
    console.log('receipt', receipt);
    const latestReceiptInfo = receipt.latest_receipt_info[0];
    const pendingRenewalInfo = receipt.pending_renewal_info?.[0] || {};

    // 1. Find or create subscription
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId: latestReceiptInfo.original_transaction_id },
      {
        user: userId,
        productId: latestReceiptInfo.product_id,
        purchaseDate: new Date(parseInt(latestReceiptInfo.purchase_date_ms)),
        expiresDate: new Date(parseInt(latestReceiptInfo.expires_date_ms)),
        isTrial: latestReceiptInfo.is_trial_period === 'true',
        isActive:
          new Date(parseInt(latestReceiptInfo.expires_date_ms)) > new Date(),
        autoRenewStatus: pendingRenewalInfo.auto_renew_status === '1',
        environment: isSandbox ? 'Sandbox' : 'Production',
        latestReceipt: receipt.latest_receipt,
        pendingRenewalInfo: {
          autoRenewProductId: pendingRenewalInfo.auto_renew_product_id,
          autoRenewStatus: pendingRenewalInfo.auto_renew_status === '1',
          expirationIntent: pendingRenewalInfo.expiration_intent,
        },
      },
      { upsert: true, new: true }
    );

    // 2. Update user's subscription status
    await Models.User.findByIdAndUpdate(userId, {
      isSubscribed: subscription.isActive,
      subscription: subscription._id,
    });

    // 3. Handle trial period events
    if (subscription.isTrial) {
      await Event.updateMany({ creator: userId }, { createdDuringTrial: true });
    }

    return {
      status: 'success',
      subscription,
      latestReceipt: receipt.latest_receipt,
    };
  } catch (error) {
    console.error('Verification error', error);
    throw error;
  }
}
// -------------------------------
// Modern JWS Validation
async function verifyJWS(jwsString) {
  try {
    // Decode without verification first
    const decoded = jwt.decode(jwsString, { complete: true });
    if (!decoded) throw new Error('Invalid JWS format');

    // Get Apple's current keys
    const { data } = await axios.get('https://appleid.apple.com/auth/keys');
    const key = data.keys.find((k) => k.kid === decoded.header.kid);
    if (!key) throw new Error(`No key found for kid: ${decoded.header.kid}`);

    // Convert JWK to PEM
    const publicKey = crypto
      .createPublicKey({
        key: {
          kty: key.kty,
          n: key.n,
          e: key.e,
          crv: key.crv,
          x: key.x,
          y: key.y,
        },
        format: 'jwk',
      })
      .export({ type: 'spki', format: 'pem' });

    // Verify signature
    const payload = jwt.verify(jwsString, publicKey, {
      algorithms: ['ES256'],
      clockTolerance: 60,
      issuer: 'App Store',
      audience: BUNDLE_ID,
    });

    // Validate environment
    if (!['Production', 'Sandbox'].includes(payload.environment)) {
      throw new Error(`Invalid environment: ${payload.environment}`);
    }

    return {
      ...payload,
      isTest: payload.environment === 'Sandbox',
      verifiedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('JWS verification failed:', error);
    throw new Error(`JWS verification failed: ${error.message}`);
  }
}

module.exports = {
  generateOTP,
  generateQRCode,
  getObjectPathFromUrl,
  getFullImageUrl,
  generateVerificationToken,
  verifyReceipt,
  verifyLegacyReceipt,
  verifyJWS,
};
