const subscriptionRouter = require('express').Router();
const {
  validateReceiptHandler,
  subscriptionWebhooksHandler,
  getSubscriptionStatusHandler,
} = require('../modules/subscription/controller/subscription.controller');
const authentication = require('../middlewares/authentication.middleware');

subscriptionRouter.post(
  '/validate-receipt',
  authentication,
  validateReceiptHandler
);
subscriptionRouter.post('/webhooks', subscriptionWebhooksHandler);
subscriptionRouter.get(
  '/subscription-status',
  authentication,
  getSubscriptionStatusHandler
);

module.exports = subscriptionRouter;
