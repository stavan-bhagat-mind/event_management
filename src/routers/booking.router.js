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

  //   cancelBookingHandler,
  //   getUserBookingsHandler
} = require('../modules/booking/controller/booking.controller');
const authentication = require('../middlewares/authentication.middleware');

bookingRouter.get('/booking-list', authentication, getBookingListHandler);
bookingRouter.get('/validate-qr/:id', validateQRCodeHandler);
bookingRouter.get('/event-attendee-list/:id', authentication, getEventAttendeeListHandler);
bookingRouter.get('/:id', authentication, getBookingDetailsHandler);
// todo
// bookingRouter.post('/create-iapp-payment', handleIAPPaymentHandler);

// bookingRouter.get('/bookingDetails', getUserBookingsHandler);

// bookingRouter.get('/my-events', authentication, getUserCreatedEventsHandler);
// bookingRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = bookingRouter;
