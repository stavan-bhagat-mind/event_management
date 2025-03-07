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

const Models = require('../models/index');

const checkSubscription = async (req, res, next) => {
  try {
    const user = await Models.User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.userType !== 'event_manager') {
      return res
        .status(403)
        .json({ message: 'Only event managers can create events' });
    }

    // Get user's active subscription
    const subscription = await Models.UserSubscription.findOne({
      userId: user._id,
      status: 'ACTIVE',
      deletedAt: null,
    }).populate('planId');

    if (!subscription) {
      return res.status(403).json({
        message:
          'No active subscription found. Please subscribe or start a free trial.',
      });
    }

    // Check if subscription has expired
    if (new Date() > subscription.endDate) {
      subscription.status = 'EXPIRED';
      await subscription.save();

      return res.status(403).json({
        message:
          'Your subscription has expired. Please renew your subscription.',
      });
    }

    // Check if user can create more events (based on plan limits)
    if (
      subscription.planId.maxEvents !== -1 &&
      subscription.eventsCreated >= subscription.planId.maxEvents
    ) {
      return res.status(403).json({
        message: `You've reached the limit of ${subscription.planId.maxEvents} events for your ${subscription.planId.name} plan. Please upgrade to a higher plan.`,
      });
    }

    // Add subscription info to request for later use
    req.subscription = subscription;
    req.isFreeTrial = subscription.isFreeTrial;
    next();
  } catch (err) {
    console.error('Subscription check error:', err);
    res
      .status(500)
      .json({ message: 'Server error while checking subscription' });
  }
};

module.exports = checkSubscription;
