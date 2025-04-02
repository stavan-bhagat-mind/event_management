// const Models = require('../models/index');

// const checkSubscription = async (req, res, next) => {
//   try {
//     const user = await Models.User.findById(req.user.id);

//     if (user.role !== 'event_manager') {
//       return res
//         .status(403)
//         .json({ message: 'Only event managers can create events' });
//     }

//     // Check subscription validity
//     if (
//       user.subscription.planType === 'trial' &&
//       Date.now() > user.subscription.endDate
//     ) {
//       return res
//         .status(403)
//         .json({ message: 'Trial period expired. Please subscribe.' });
//     }

//     if (
//       user.subscription.planType === '3-month' &&
//       user.subscription.eventsCreated >= 10
//     ) {
//       return res
//         .status(403)
//         .json({ message: 'Event limit reached. Upgrade your plan.' });
//     }

//     req.user.subscription = user.subscription;
//     next();
//   } catch (err) {
//     res.status(500).json({ message: 'Server error' });
//   }
// };

// module.exports = checkSubscription;

// ----------------------------------------------------------------

// const checkSubscription = async (req, res, next) => {
//   try {
//     const user = await Models.User.findById(req.user.id);

//     if (!user) {
//       return res.status(404).json({ message: 'User not found' });
//     }

//     if (user.userType !== 'event_manager') {
//       return res
//         .status(403)
//         .json({ message: 'Only event managers can create events' });
//     }

//     // Get user's active subscription
//     const subscription = await Models.UserSubscription.findOne({
//       userId: user._id,
//       status: 'ACTIVE',
//       deletedAt: null,
//     }).populate('planId');

//     if (!subscription) {
//       return res.status(403).json({
//         message:
//           'No active subscription found. Please subscribe or start a free trial.',
//       });
//     }

//     // Check if subscription has expired
//     if (new Date() > subscription.endDate) {
//       subscription.status = 'EXPIRED';
//       await subscription.save();

//       return res.status(403).json({
//         message:
//           'Your subscription has expired. Please renew your subscription.',
//       });
//     }

//     // Check if user can create more events (based on plan limits)
//     if (
//       subscription.planId.maxEvents !== -1 &&
//       subscription.eventsCreated >= subscription.planId.maxEvents
//     ) {
//       return res.status(403).json({
//         message: `You've reached the limit of ${subscription.planId.maxEvents} events for your ${subscription.planId.name} plan. Please upgrade to a higher plan.`,
//       });
//     }

//     // Add subscription info to request for later use
//     req.subscription = subscription;
//     req.isFreeTrial = subscription.isFreeTrial;
//     next();
//   } catch (err) {
//     console.error('Subscription check error:', err);
//     res
//       .status(500)
//       .json({ message: 'Server error while checking subscription' });
//   }
// };
// -----------------------------------------------------------------------

// const Models = require('../models/index');
// const {
//   MANAGER_ONLY_CREATE_EVENT,
// } = require('../modules/events/utils/events.messages');
// const { errorResponseWithoutData } = require('../utils/response');
// const { ROLE } = require('../utils/common/constants');
// const {
//   MSG_INTERNAL_SERVER_ERROR,
//   COMMON_MSG,
// } = require('../utils/common/messages');
// const {
//   STATUS_INTERNAL_SERVER_ERROR,
//   STATUS_BAD_REQUEST,
//   STATUS_NOT_FOUND,
//   STATUS_FORBIDDEN,
// } = require('../utils/common/constants');
// const {
//   NO_ACTIVE_SUBSCRIPTION,
// } = require('../modules/subscription/utils/subscription.messages');

// const checkSubscription = async (req, res, next) => {
//   try {
//     const userId = req.userId;

//     // 1. Fetch user document
//     const user = await Models.User.findById(userId);
//     if (!user) {
//       return errorResponseWithoutData(
//         res,
//         STATUS_NOT_FOUND,
//         COMMON_MSG.NOT_FOUND.replace('##', 'User')
//       );
//     }

//     // 2. Verify user type
//     if (user.userType !== ROLE[1]) {
//       return errorResponseWithoutData(
//         res,
//         STATUS_FORBIDDEN,
//         MANAGER_ONLY_CREATE_EVENT
//       );
//     }

//     // 3. Find active subscription
//     const subscription = await Models.Subscription.findOne({
//       user: userId,
//       isActive: true,
//       expiresDate: { $gt: new Date() },
//     });

//     if (!subscription) {
//       return errorResponseWithoutData(
//         res,
//         STATUS_FORBIDDEN,
//         NO_ACTIVE_SUBSCRIPTION
//       );
//     }

//     // 4. Calculate event count for subscription period
//     const eventCount = await Models.Event.countDocuments({
//       creator: userId,
//       createdAt: { $gte: subscription.purchaseDate },
//     });

//     // 5. Determine creation rights
//     let canCreateEvent = false;
//     let shouldMarkAsTrial = false;

//     if (subscription.isTrial) {
//       canCreateEvent = true;
//       shouldMarkAsTrial = true;
//     } else if (subscription.productId === 'com.yearly') {
//       canCreateEvent = true;
//     } else if (subscription.productId === 'com.monthly') {
//       canCreateEvent = eventCount < 10;
//     }

//     // 6. Enforce limits
//     if (!canCreateEvent) {
//       const message =
//         subscription.productId === 'com.monthly'
//           ? 'Monthly event limit (10) reached. Upgrade to yearly for unlimited.'
//           : 'Event creation not allowed';
//       return errorResponseWithoutData(res, STATUS_FORBIDDEN, message);
//     }

//     // 7. Set creation context
//     req.eventCreationContext = {
//       isTrialEvent: shouldMarkAsTrial,
//       isPublished: !shouldMarkAsTrial,
//       subscription: subscription,
//     };

//     next();
//   } catch (error) {
//     console.error('Subscription middleware error:', error);
//     return errorResponseWithoutData(
//       res,
//       STATUS_INTERNAL_SERVER_ERROR,
//       MSG_INTERNAL_SERVER_ERROR
//     );
//   }
// };
// module.exports = checkSubscription;

// --------
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
      canCreateEvent = eventCount < 10; // Monthly limit: 10 events
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
