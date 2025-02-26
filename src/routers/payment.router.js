const paymentRouter = require('express').Router();
const express = require('express');
const {
  paymentIntentCreationHandler,
  handleStripeWebhookHandler,
  confirmPaymentHandler
} = require('../modules/payment/controller/payment.controller');
const authentication = require('../middlewares/authentication.middleware');

paymentRouter.post(
  '/create-payment-intent',
  authentication,
  paymentIntentCreationHandler
);
paymentRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhookHandler
);

// for test only
paymentRouter.get('/test-payment',confirmPaymentHandler)
module.exports = paymentRouter;
