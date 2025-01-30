const indexRouter = require('express').Router();
const eventRouter = require('../routers/event.router');
const userRouter = require('../routers/user.router');

indexRouter.use('/event', eventRouter);
indexRouter.use('/user', userRouter);

module.exports = indexRouter;
