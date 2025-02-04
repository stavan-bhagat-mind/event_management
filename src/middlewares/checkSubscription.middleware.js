const Models = require('../models/index');

const checkSubscription = async (req, res, next) => {
  try {
    const user = await Models.User.findById(req.user.id);

    if (user.role !== 'event_manager') {
      return res
        .status(403)
        .json({ message: 'Only event managers can create events' });
    }

    // Check subscription validity
    if (
      user.subscription.planType === 'trial' &&
      Date.now() > user.subscription.endDate
    ) {
      return res
        .status(403)
        .json({ message: 'Trial period expired. Please subscribe.' });
    }

    if (
      user.subscription.planType === '3-month' &&
      user.subscription.eventsCreated >= 10
    ) {
      return res
        .status(403)
        .json({ message: 'Event limit reached. Upgrade your plan.' });
    }

    req.user.subscription = user.subscription;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = checkSubscription;
