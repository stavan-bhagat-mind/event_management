// const rateLimit = require('express-rate-limit');

// const ResetRateLimiter = rateLimit({
//   windowMs: 60 * 60 * 1000,
//   max: 3,
//   message:
//     'Too many password reset requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// module.exports = {
//   ResetRateLimiter,
// };
const Models = require('../models/index');
const { errorResponseData } = require('../utils/response');
const { STATUS_TO_MANY_REQUEST } = require('../utils/common/constants');

const defaultLimits = {
  'reset-password': { maxAttempts: 3, timeWindowInHours: 1 },
  'verify-email': { maxAttempts: 3, timeWindowInHours: 1 },
  login: { maxAttempts: 5, timeWindowInHours: 1 },
};

async function checkRateLimit(identifier, actionType) {
  try {
    const limits = defaultLimits[actionType];
    if (!limits) {
      throw new Error(`Unknown action type: ${actionType}`);
    }

    const timeWindow = limits.timeWindowInHours * 60 * 60 * 1000;
    const windowStart = new Date(Date.now() - timeWindow);

    // Find existing record
    let record = await Models.RateLimit.findOne({
      identifier,
      actionType,
      lastAttempt: { $gte: windowStart },
    });

    // If no record found, create new one - THIS WAS MISSING
    if (!record) {
      record = await Models.RateLimit.create({
        identifier,
        actionType,
        attempts: 1,
        lastAttempt: new Date(),
      });

      return {
        allowed: true,
        attemptsRemaining: limits.maxAttempts - 1,
      };
    }

    // Check if max attempts reached
    if (record.attempts >= limits.maxAttempts) {
      return {
        allowed: false,
        attemptsRemaining: 0,
        tryAgainInMinutes: Math.ceil(
          (timeWindow - (Date.now() - record.lastAttempt.getTime())) /
            (1000 * 60)
        ),
      };
    }

    // Increment attempts
    record.attempts += 1;
    record.lastAttempt = new Date();
    await record.save();

    return {
      allowed: true,
      attemptsRemaining: limits.maxAttempts - record.attempts,
    };
  } catch (error) {
    console.error('Rate limit check failed:', error);
    return { allowed: true };
  }
}

function createRateLimiter(actionType) {
  return async (req, res, next) => {
    try {
      const identifier = req.body.email || req.ip;

      // Add some logging to help debug
      console.log('Rate limit check for:', { identifier, actionType });

      const result = await checkRateLimit(identifier, actionType);

      if (!result.allowed) {
        errorResponseData(
          res,
          STATUS_TO_MANY_REQUEST,
          'Too many attempts',
          (tryAgainInMinutes = result.tryAgainInMinutes)
        );
      }

      next();
    } catch (error) {
      console.error('Rate limit middleware error:', error);
      next();
    }
  };
}

module.exports = { createRateLimiter };
