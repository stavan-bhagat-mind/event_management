const eventRouter = require('express').Router();
const {
  createEventHandler,
  updateEventHandler,
  getUserCreatedEventsHandler,
  getPublishedEventsHandler,
  deleteEventHandler,
  getEventDetailsHandler,
  saveEventHandler,
  removeSavedEventHandler,
  getSavedEventsHandler,
  getAllPublishedEventsHandler,
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
eventRouter.get('/all-public-events', getAllPublishedEventsHandler);
;
// saved-events
eventRouter.post('/save-event', authentication, saveEventHandler);
eventRouter.get('/get-saved-events', authentication, getSavedEventsHandler);
eventRouter.delete('/remove/:id', authentication, removeSavedEventHandler);
// generic parameter route
eventRouter.get('/:id', getEventDetailsHandler);
eventRouter.delete('/:id', authentication, deleteEventHandler);

module.exports = eventRouter;
