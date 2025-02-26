const indexRouter = require('express').Router();
const eventRouter = require('../routers/event.router');
const userRouter = require('../routers/user.router');
// const bookingRouter = require('../routers/booking.router');
const paymentRouter = require('../routers/payment.router');

indexRouter.use('/event', eventRouter);
indexRouter.use('/user', userRouter);
// indexRouter.use('/booking', bookingRouter);
indexRouter.use('/payment', paymentRouter);

module.exports = indexRouter;
