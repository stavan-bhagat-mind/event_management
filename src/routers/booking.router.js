const bookingRouter = require('express').Router();
const {
  createBookingHandler,
  getBookingDetailsHandler,
  paymentIntentCreationHandler,
  handleIAPPaymentHandler,
  handleStripeWebhookHandler,
  //   cancelBookingHandler,
  //   getUserBookingsHandler
} = require('../modules/booking/controller/booking.controller');
const authentication = require('../middlewares/authentication.middleware');

bookingRouter.post('/create', authentication, createBookingHandler);
// bookingRouter.patch(
//   '/:id',
//   authentication,
//   multipleUpload('image', 5),
//   updateEventHandler
// );
bookingRouter.get('/:id', getBookingDetailsHandler);
bookingRouter.post('/create-payment-intent', paymentIntentCreationHandler);
bookingRouter.post('/create-iapp-payment', handleIAPPaymentHandler);
bookingRouter.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  handleStripeWebhookHandler
);
// bookingRouter.get('/bookingDetails', getUserBookingsHandler);

// bookingRouter.get('/my-events', authentication, getUserCreatedEventsHandler);
// bookingRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = bookingRouter;
