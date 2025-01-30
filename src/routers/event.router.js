const eventRouter = require('express').Router();
// const {
//   //   createEvent,
//   //   getEvent,
//   //   getEvents,
//   //   updateEvent,
//   //   deleteEvent,
// } = require('../modules/event/controller/event.controller');
const authentication = require('../middlewares/authentication.middleware');
// const upload = require('../middlewares/upload.middleware');

// eventRouter.post(
//   '/create',
//   authentication,
//   upload.single('image'),
//   createEvent
// );
eventRouter.get('/:id', (req, res) => {
  res.send('GET /event/:id');
});

// eventRouter.get('/', getEvents);
// eventRouter.put('/:id', authentication, upload.single('image'), updateEvent);
// eventRouter.delete('/:id', authentication, deleteEvent);

module.exports = eventRouter;
