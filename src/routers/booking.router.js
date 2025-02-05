const bookingRouter = require('express').Router();
const {
  createEventHandler,
  //   getEvent,
  //   getEvents,
  updateEventHandler,
  getUserCreatedEventsHandler,
  getPublishedEventsHandler,
  deleteEventHandler,
  getEventDetailsHandler,
} = require('../modules/events/controller/events.controller');
const {
  createBookingHandler,
  //   getBookingDetailsHandler,
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
// bookingRouter.get('/:id', getBookingDetailsHandler);
// bookingRouter.get('/bookingDetails', getUserBookingsHandler);

// bookingRouter.get('/my-events', authentication, getUserCreatedEventsHandler);
// bookingRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = bookingRouter;
