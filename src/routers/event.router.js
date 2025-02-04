const eventRouter = require('express').Router();
const {
  createEventHandler,
  //   getEvent,
  //   getEvents,
  //   updateEventHandler,
  // getUserCreatedEventsHandler
  // getPublishEventsHandler
  //   deleteEventHandler,
} = require('../modules/events/controller/events.controller');
const authentication = require('../middlewares/authentication.middleware');
const { multipleUpload } = require('../config/multer.config');

eventRouter.post(
  '/create',
  authentication,
  multipleUpload('images', 5),
  createEventHandler
); 

// eventRouter.get('my-events',getUserCreatedEventsHandler
// });
// eventRouter.get('/public', getPublishEventsHandler);
// eventRouter.put('/:id', authentication, upload.single('image'), updateEventHandler);
// eventRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = eventRouter;
