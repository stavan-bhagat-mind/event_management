const bookingRouter = require('express').Router();
const {
  createBookingHandler,
  getBookingDetailsHandler,
  getBookingListHandler,
  getEventAttendeeListHandler,
  paymentIntentCreationHandler,
  handleIAPPaymentHandler,
  handleStripeWebhookHandler,
  validateQRCodeHandler,
} = require('../modules/booking/controller/booking.controller');
const authentication = require('../middlewares/authentication.middleware');

bookingRouter.get('/booking-list', authentication, getBookingListHandler);
bookingRouter.get('/validate-qr/:id', validateQRCodeHandler);
bookingRouter.get(
  '/event-attendee-list/:id',
  authentication,
  getEventAttendeeListHandler
);
bookingRouter.get('/:id', authentication, getBookingDetailsHandler);

module.exports = bookingRouter;
