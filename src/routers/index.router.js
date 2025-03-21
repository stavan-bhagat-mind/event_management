const indexRouter = require('express').Router();
const eventRouter = require('../routers/event.router');
const userRouter = require('../routers/user.router');
const bookingRouter = require('../routers/booking.router');
const paymentRouter = require('../routers/payment.router');
const subscriptionRouter = require('../routers/subscription.router');

indexRouter.use('/event', eventRouter);
indexRouter.use('/user', userRouter);
indexRouter.use('/booking', bookingRouter);
indexRouter.use('/payment', paymentRouter);
indexRouter.use('/subscription', subscriptionRouter);

module.exports = indexRouter;
