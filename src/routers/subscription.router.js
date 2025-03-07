const subscriptionRouter = require('express').Router();
const express = require('express');
const {
  paymentIntentCreationHandler,
  handleStripeWebhookHandler,
  confirmPaymentHandler,
} = require('../modules/subscription/controller/subscription.controller');
const authentication = require('../middlewares/authentication.middleware');

subscriptionRouter.post(
  '/create-payment-intent',
  authentication,
  paymentIntentCreationHandler
);
subscriptionRouter.post('/webhook', handleStripeWebhookHandler);

// for test only
subscriptionRouter.post('/test-payment', confirmPaymentHandler);

module.exports = subscriptionRouter;
