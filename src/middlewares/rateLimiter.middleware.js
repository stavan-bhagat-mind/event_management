const rateLimit = require('express-rate-limit');

const ResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message:
    'Too many password reset requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  ResetRateLimiter,
};
