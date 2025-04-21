const subscriptionRouter = require('express').Router();
const {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
  validateSubscriptionHandler
} = require('../modules/subscription/controller/subscription.controller');
const authentication = require('../middlewares/authentication.middleware');

subscriptionRouter.post(
  '/validate-receipt',
  authentication,
  validateReceiptHandler
);

subscriptionRouter.post(
  '/validate-subscription',
  authentication,
  validateSubscriptionHandler
);
subscriptionRouter.post('/webhooks', subscriptionWebhooksHandler);
subscriptionRouter.get(
  '/subscription-status',
  authentication,
  getSubscriptionStatusHandler
);

module.exports = subscriptionRouter;
