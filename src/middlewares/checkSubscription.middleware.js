const moment = require('moment');
const Models = require('../models/index');
const {
  MANAGER_ONLY_CREATE_EVENT,
} = require('../modules/events/utils/events.messages');
const { errorResponseWithoutData } = require('../utils/response');
const { ROLE } = require('../utils/common/constants');
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
} = require('../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_FORBIDDEN,
} = require('../utils/common/constants');
const {
  NO_ACTIVE_SUBSCRIPTION,
} = require('../modules/subscription/utils/subscription.messages');

const checkSubscription = async (req, res, next) => {
  try {
    const userId = req.userId;

    // 1. Fetch user document
    const user = await Models.User.findById(userId);
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'User')
      );
    }

    // 2. Verify user is an event manager
    if (user.userType !== ROLE[1]) {
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        MANAGER_ONLY_CREATE_EVENT
      );
    }

    // 3. Find ACTIVE subscription (status: 'active' and not expired)
    const subscription = await Models.Subscription.findOne({
      user: userId,
      status: 'active',
      expiresDate: { $gt: new Date() },
    });
    console.log('date', new Date());
    console.log('subscription', subscription);
    if (!subscription) {
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        NO_ACTIVE_SUBSCRIPTION
      );
    }

    // 4. Calculate event count based on subscription type
    let eventCount;
    const now = new Date();

    if (subscription.productId === 'com.monthly') {
      // For monthly subscriptions, count events created THIS MONTH
      const startOfMonth = moment().startOf('month').toDate();
      eventCount = await Models.Event.countDocuments({
        creator: userId,
        createdAt: { $gte: startOfMonth }, // Reset count monthly
      });
    } else {
      // For yearly/trial, count since purchase date
      eventCount = await Models.Event.countDocuments({
        creator: userId,
        createdAt: { $gte: subscription.purchaseDate },
      });
    }

    // 5. Determine if user can create an event
    let canCreateEvent = false;
    let shouldMarkAsTrial = false;

    if (subscription.status === 'trial' && subscription.expiresDate > now) {
      canCreateEvent = true;
      shouldMarkAsTrial = true;
    } else if (subscription.productId === 'com.yearly') {
      canCreateEvent = true;
    } else if (subscription.productId === 'com.monthly') {
      canCreateEvent = eventCount <=3; // Monthly limit: 10 events
    }

    // 6. Reject if limits are exceeded
    if (!canCreateEvent) {
      let message;
      if (subscription.productId === 'com.monthly') {
        message =
          'Monthly event limit (10) reached. Upgrade to yearly for unlimited.';
      } else if (
        subscription.status === 'trial' &&
        subscription.expiresDate <= now
      ) {
        message = 'Trial period expired. Subscribe to continue.';
      } else {
        message = 'Event creation not allowed for your subscription.';
      }
      return errorResponseWithoutData(res, STATUS_FORBIDDEN, message);
    }

    // 7. Attach subscription context to request
    req.eventCreationContext = {
      isTrialEvent: shouldMarkAsTrial,
      isPublished: !shouldMarkAsTrial, // Auto-publish if not trial
      subscription: subscription,
    };

    next();
  } catch (error) {
    console.error('Subscription middleware error:', error);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

module.exports = checkSubscription;
