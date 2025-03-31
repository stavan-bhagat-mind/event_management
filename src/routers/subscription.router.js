const subscriptionRouter = require('express').Router();
const express = require('express');
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
subscriptionRouter.post(
  '/webhooks',
  // authentication,
  subscriptionWebhooksHandler
);
subscriptionRouter.get(
  '/subscription-status/:userId',
  authentication,
  getSubscriptionStatusHandler
);

module.exports = subscriptionRouter;
