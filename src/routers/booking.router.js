const bookingRouter = require('express').Router();
const {
  createBookingHandler,
  getBookingDetailsHandler,
  paymentIntentCreationHandler,
  handleIAPPaymentHandler,
  handleStripeWebhookHandler,
  validateQRCodeHandler,
  //   cancelBookingHandler,
  //   getUserBookingsHandler
} = require('../modules/booking/controller/booking.controller');
const authentication = require('../middlewares/authentication.middleware');

bookingRouter.post('/create', authentication, createBookingHandler);
bookingRouter.get('/:id', getBookingDetailsHandler);

// todo
// bookingRouter.post('/validate-qr', validateQRCodeHandler);
// bookingRouter.post('/create-iapp-payment', handleIAPPaymentHandler);

// bookingRouter.get('/bookingDetails', getUserBookingsHandler);

// bookingRouter.get('/my-events', authentication, getUserCreatedEventsHandler);
// bookingRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = bookingRouter;
