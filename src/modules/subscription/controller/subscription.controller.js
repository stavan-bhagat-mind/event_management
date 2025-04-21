const Models = require('../../../models/index');
require('dotenv').config();
const jws = require('jws');
const {
  successResponseData,
  errorResponseWithoutData,
  successResponseWithoutData,
} = require('../../../utils/response');
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
} = require('../../../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_SUCCESS,
  CATEGORY,
} = require('../../../utils/common/constants');
const { verifyJWS, verifyLegacyReceipt } = require('../../../helpers/helper');
const { NOTIFICATION_TYPES } = require('../utils/subscription.constant');
const {
  SUBSCRIPTION_SUCCESSFULLY_VALIDATED,
} = require('../utils/subscription.messages');
const {
  sendExpirationEmail,
  sendRenewalStatusEmail,
  sendGracePeriodExpiredEmail,
  sendSubscriptionStartedEmail,
  sendPlanChangedEmail,
  // sendPaymentFailureEmail,
  // sendCancellationEmail,
  // sendRecoveryEmail,
} = require('../../../config/email.config');
const crypto = require('crypto');

// validation receipt
const validateReceiptHandler = async (req, res) => {
  try {
    console.log('inside validateReceiptHandler');
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
      error.message
    );
  }
};

// validate subscription
const validateSubscriptionHandler = async (req, res) => {
  try {
    console.log('inside validateSubscriptionHandler');
  } catch (error) {
    console.error(`validateSubscriptionHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};
// get subscription status
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
        COMMON_MSG.FETCHED_SUCCESS.replace('##', CATEGORY.SUBSCRIPTION_STATUS)
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
      COMMON_MSG.FETCHED_SUCCESS.replace('##', CATEGORY.SUBSCRIPTION_STATUS)
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

// Webhook handler for App Store Server Notifications
const subscriptionWebhooksHandler = async (req, res) => {
  try {
    console.log('Received App Store notification');
    const signedPayload = req.body.signedPayload;
    if (!signedPayload) {
      console.error('No signedPayload in request body');
      return res.status(400).json({ error: 'Missing signedPayload' });
    }

    try {
      // Verify and decode the JWS
      const decodedPayload = await verifyAndDecodeSignature(signedPayload);

      await processNotification(decodedPayload);

      // 200 OK to acknowledge receipt
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error('Error processing signedPayload:', error);
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
// -----------------------------------------------------------------------

// Then modify your verifyAndDecodeSignature function
const verifyAndDecodeSignature = async (signedPayload) => {
  try {
    // Decode the JWS without verification first
    const decoded = jws.decode(signedPayload);

    if (!decoded) {
      throw new Error('Invalid JWS format');
    }

    // Extract the header and verify it contains the necessary certificate info
    const header = decoded.header;

    if (!header.x5c || !Array.isArray(header.x5c) || header.x5c.length === 0) {
      throw new Error('Missing certificate chain in JWS header');
    }

    // Format the certificates from the header
    const certChain = header.x5c.map((cert) => formatPemCertificate(cert));

    // Verify the certificate chain
    const isValidChain = await verifyCertificateChain(certChain);

    if (!isValidChain) {
      throw new Error('Invalid certificate chain');
    }

    // Verify the signature using the leaf certificate (first in the chain)
    const verified = jws.verify(signedPayload, header.alg, certChain[0]);

    if (!verified) {
      throw new Error('JWS signature verification failed');
    }

    // Parse the payload
    const payload = JSON.parse(decoded.payload);
    console.log('inside payload decode', payload);
    return payload;
  } catch (error) {
    console.error('Error verifying and decoding signature:', error);
    throw new Error(`Invalid signature: ${error.message}`);
  }
};

//------------------------- skipped function for sandbox-start-----------------------
const loadAppleRootCertificates = () => {
  console.log('Sandbox mode: Skipping Apple root certificate loading');
  return []; // Return empty array as we're skipping verification
};
const isCertificateRevoked = async (cert) => {
  // Skip revocation check in sandbox
  return false;
};
const verifyCertificateChain = async (certChain) => {
  // For sandbox testing, we can skip the full certificate chain verification
  console.log('Sandbox mode: Skipping full certificate chain verification');
  return true;
};
// ---------------- skipped function for sandbox-end---------------
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
    case NOTIFICATION_TYPES.DID_CHANGE_RENEWAL_PREF:
      await handleRenewalPreferenceChange(data);
      break;
    case NOTIFICATION_TYPES.DID_CHANGE_RENEWAL_STATUS:
      await handleRenewalStatusChange(data);
      break;
    case NOTIFICATION_TYPES.GRACE_PERIOD_EXPIRED:
      await handleGracePeriodExpiration(data);
      break;
    case NOTIFICATION_TYPES.EXPIRED:
      await handleExpiration(data);
      break;
    //
    case NOTIFICATION_TYPES.DID_RENEW:
      await handleRenewal(data);
      break;
    case NOTIFICATION_TYPES.DID_FAIL_TO_RENEW:
      await handleFailedRenewal(data);
      break;
    case NOTIFICATION_TYPES.REVOKE:
      await handleRevocation(data);
      break;
    case NOTIFICATION_TYPES.REFUND:
      await handleRefund(data);
      break;
    default:
      console.log(`Unhandled notification type: ${notificationType}`);
      // Store the notification for analysis
      await storeRawNotification(decodedPayload);
  }
};
// ----------------- notification handlers-start-------------------
// Handler for NEW subscription
async function handleNewSubscription(data) {
  try {
    const { signedTransactionInfo, appAppleId, bundleId, environment } = data;

    console.log('Received new subscription data:', data);
    // Verify and decode the transaction information
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );
    const { originalTransactionId, offerType } = transactionInfo;

    // Create/update subscription
    const subscription = await Models.Subscription.findOne({
      originalTransactionId,
    }).select('_id productId status expiresDate user');

    const user = await Models.User.findById(subscription.user).select(
      '_id firstName lastName email'
    );

    // Send welcome email
    await sendSubscriptionStartedEmail(user.email, {
      user,
      subscription,
      additionalInfo: {
        isTrial: offerType === 'TRIAL',
      },
    });
    console.log(`Processed subscription ${subscription._id} for ${appAppleId}`);
    return subscription;
  } catch (error) {
    console.error('Subscription processing failed:', error);
    throw error; // Propagate error for upstream handling
  }
}

// Handler for subscription preference changes (plan changes)
async function handleRenewalPreferenceChange(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId, productId, expiresDate } = transactionInfo;
    // Find current subscription first to get the old plan
    const existingSubscription = await Models.Subscription.findOne({
      originalTransactionId,
    });

    if (!existingSubscription) {
      console.error(
        `No subscription found for plan change: ${originalTransactionId}`
      );
      return;
    }
    const oldPlan = existingSubscription.productId;

    // Update subscription with new product ID (plan)
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        productId, // New plan
        expiresDate: new Date(expiresDate),
        lastVerified: new Date(),
      },
      { new: true }
    ).select('_id productId status expiresDate user');

    const user = await Models.User.findById(subscription.user).select(
      '_id firstName lastName email'
    );

    await sendPlanChangedEmail(user.email, {
      user,
      subscription,
      additionalInfo: {
        oldPlan,
        newPlan: productId,
        effectiveImmediately: false,
      },
    });

    console.log(
      `Subscription plan changed: ${originalTransactionId}, new plan: ${productId}`
    );
    return subscription;
  } catch (error) {
    console.error('Error processing renewal preference change:', error);
    throw error;
  }
}

// Handler for renewal status changes (cancellations)
async function handleRenewalStatusChange(data) {
  try {
    const { signedRenewalInfo } = data;
    const renewalInfo = await verifyAndDecodeSignature(signedRenewalInfo);

    const { originalTransactionId, autoRenewStatus, renewalDate } = renewalInfo;
    console.log('expiresDate', new Date(renewalDate));
    const updateFields = {
      autoRenewStatus: autoRenewStatus === 1, // Convert to boolean
      lastVerified: new Date(),
      'pendingRenewalInfo.autoRenewStatus': !!autoRenewStatus,
    };

    // update if it exists in the payload
    if (renewalInfo.expiresDate) {
      updateFields.expiresDate = new Date(renewalInfo.expiresDate);
    }

    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      updateFields,
      { new: true }
    ).select('_id productId status expiresDate user');

    const user = await Models.User.findById(subscription.user).select(
      '_id firstName lastName email'
    );
    // send mail
    await sendRenewalStatusEmail(user.email, {
      user,
      subscription,
      additionalInfo: {
        autoRenew: true,
      },
    });

    console.log(
      `Subscription auto-renewal status updated: ${originalTransactionId}, status: ${autoRenewStatus}`
    );
    return subscription;
  } catch (error) {
    console.error('Error processing renewal status change:', error);
    throw error;
  }
}

// Handler for expired grace period
async function handleGracePeriodExpiration(data) {
  try {
    const { signedTransactionInfo } = data;
    const transactionInfo = await verifyAndDecodeSignature(
      signedTransactionInfo
    );

    const { originalTransactionId } = transactionInfo;

    // Mark subscription as inactive after grace period
    const subscription = await Models.Subscription.findOneAndUpdate(
      { originalTransactionId },
      {
        isActive: false,
        status: 'expired',
        lastVerified: new Date(),
      },
      { new: true }
    ).select('_id productId status expiresDate user');

    // Update user subscription status
    if (subscription) {
      const user = await Models.User.findByIdAndUpdate(subscription.user, {
        isSubscribed: false,
      }).select('_id firstName lastName email');

      if (user) {
        // send mail
        await sendGracePeriodExpiredEmail(user.email, {
          user,
          subscription,
        });
      }
    }

    if (user) {
      // Send grace period expired email
      await sendGracePeriodExpiredEmail(user.email, {
        user,
        subscription,
      });
    }
    console.log(
      `Grace period expired for subscription: ${originalTransactionId}`
    );
    return subscription;
  } catch (error) {
    console.error('Error processing grace period expiration:', error);
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
    ).select('_id productId status expiresDate user');

    if (!subscription) {
      console.error(
        `No subscription found for expiration: ${originalTransactionId}`
      );
      return;
    }
    if (subscription) {
      // Update user subscription status
      const user = await Models.User.findByIdAndUpdate(subscription.user, {
        isSubscribed: false,
      }).select('_id firstName lastName email');

      if (user) {
        // Send expiration email
        await sendExpirationEmail(user.email, {
          user,
          subscription,
        });
      }
    }

    console.log(`Subscription expired: ${originalTransactionId}`);
  } catch (error) {
    console.error('Error processing expiration:', error);
    throw error;
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
    ).select('_id productId status expiresDate user');

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

// --------------- yet to test or future implementation----------------

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
    // await sendPaymentFailureEmail(user.email, {
    //   user,
    //   subscription,
    //   additionalInfo: {
    //     gracePeriodDays: 16 // Adjust based on your grace period policy
    //   }
    // });

    // Optionally notify user about billing issue
    // notifyUserAboutBillingIssue(subscription.user);
  } catch (error) {
    console.error('Error processing failed renewal:', error);
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
// ------------------ end of future implementation -----------------------

// Helper to store raw notifications for debugging
async function storeRawNotification(notification) {
  // This could be implemented with a separate collection if needed
  console.log('Storing raw notification for analysis', notification);
}

module.exports = {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
  validateSubscriptionHandler,
};

// --------------------------half implemented for certificate verification-----------------
// Helper to load Apple's root CA certificates
const verifyCertificateChainHalfImplemented = async (certChain) => {
  // 1. Load Apple's root CA certificates
  const appleRootCAs = loadAppleRootCertificates();

  // 2. Verify certificate chain integrity
  // Each certificate should be signed by the next one in the chain
  for (let i = 0; i < certChain.length - 1; i++) {
    const currentCert = certChain[i];
    const issuerCert = certChain[i + 1];

    if (!verifyCertificateSignature(currentCert, issuerCert)) {
      return false;
    }
  }

  // 3. Verify the last certificate in the chain against Apple's root CAs
  const lastCert = certChain[certChain.length - 1];
  const isSignedByAppleRootCA = appleRootCAs.some((rootCA) =>
    verifyCertificateSignature(lastCert, rootCA)
  );

  if (!isSignedByAppleRootCA) {
    return false;
  }

  // 4. Check for certificate revocation (using CRL or OCSP)
  for (const cert of certChain) {
    if (await isCertificateRevoked(cert)) {
      return false;
    }
  }

  // 5. Verify certificate validity periods
  for (const cert of certChain) {
    if (!isCertificateInValidityPeriod(cert)) {
      return false;
    }
  }

  return true;
};
// to verify that a certificate was legitimately signed by its issuer.
function verifyCertificateSignature(certificate, issuerCertificate) {
  try {
    // Extract the public key from the issuer certificate
    const issuerPublicKey = crypto.createPublicKey(issuerCertificate);

    // Create a certificate object from the certificate being verified
    const cert = new crypto.X509Certificate(certificate);

    // Verify the signature using the issuer's public key
    const isValid = cert.verify(issuerPublicKey);

    return isValid;
  } catch (error) {
    console.error('Certificate signature verification error:', error);
    return false;
  }
}
