const eventRouter = require('express').Router();
const {
  createEventHandler,
  //   getEvent,
  //   getEvents,
  updateEventHandler,
  getUserCreatedEventsHandler,
  getPublishedEventsHandler,
  deleteEventHandler,
  getEventDetailsHandler,
  getPresignedUrlHandler,
} = require('../modules/events/controller/events.controller');
const authentication = require('../middlewares/authentication.middleware');
const { multipleUpload } = require('../config/multer.config');
const { generatePresignedUrl } = require('../services/file.service');
const FileService = require('../services/file.service');

eventRouter.post(
  '/create',
  authentication,
  multipleUpload('images', 5),
  createEventHandler
);
eventRouter.patch(
  '/:id',
  authentication,
  multipleUpload('images', 5),
  updateEventHandler
);

eventRouter.get('/my-events', authentication, getUserCreatedEventsHandler);
eventRouter.get('/upcoming-public', getPublishedEventsHandler);
eventRouter.get('/:id', getEventDetailsHandler);
eventRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = eventRouter;
