const subscriptionRouter = require('express').Router();
const express = require('express');
const {
  validateReceiptHandler,
  getSubscriptionStatusHandler,
  appleServerNotificationHandler,
} = require('../modules/subscription/controller/subscription.controller');
const authentication = require('../middlewares/authentication.middleware');

subscriptionRouter.post(
  '/validate-receipt',
  authentication,
  validateReceiptHandler
);
subscriptionRouter.get(
  '/subscription-status/:userId',
  authentication,
  getSubscriptionStatusHandler
);
subscriptionRouter.post(
  '/apple-server-notifications',
  authentication,
  appleServerNotificationHandler
);

module.exports = subscriptionRouter;
