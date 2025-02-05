const Models = require('../../../models/index');
const FileService = require('../../../services/file.service');
const {
  validateEventData,
} = require('../../../modules/events/validations/event.validations');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  INACTIVE_USER,
  MSG_NO_CHANGES_MADE,
} = require('../../../utils/common/messages');
const { ROLE } = require('../../../utils/common/constants');
const {
  CATEGORY,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
} = require('../../../utils/common/constants');

// Create Event
async function createEventHandler(req, res) {
  try {
    // to do : validate that user is event_manager and  has subscription will be done in middleware

    const { success, value } = validateEventData(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }

    const imageUrls = [];

    // Process file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = await FileService.uploadFile(file, {
          category: CATEGORY.EVENT,
          subCategory: value.title.replace(/\s+/g, '-'),
        });
        imageUrls.push(fileUrl.url);
      }
    }

    const event = {
      title: value.title,
      description: value.description,
      images: imageUrls,
      location: value.location,
      date: value.date,
      start_time: value.start_time,
      end_time: value.end_time,
      seats: value.seats,
      creator: req.userId,
      organizer: value.organizers,
      price: value.price,
      isPublished: true,
      // isPublished: req.user.subscription.planType !== 'trial',
    };

    await Models.Event.create(event);

    // Update user's event count
    // await User.findByIdAndUpdate(req.user.id, {
    //   $inc: { 'subscription.eventsCreated': 1 },
    // });
    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: event,
      message: COMMON_MSG.CREATED_SUCCESS.replace('##', 'Event'),
    });
  } catch (error) {
    console.error(`Registration error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

//Update Event
async function updateEventHandler(req, res) {
  try {
    const { success, value } = validateEventData(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }
    const event = await Models.Event.find({
      _id: req.params.id,
      creator: req.userId,
    });

    if (!event)
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', 'Event') });

    const imageUrls = [];

    // Process file uploads
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileUrl = await FileService.uploadFile(file, {
          category: CATEGORY.EVENT,
          subCategory: value.title.replace(/\s+/g, '-'),
        });
        imageUrls.push(fileUrl.url);
      }
    }
    // Prepare updated event data
    const updatedEvent = {
      title: value.title,
      description: value.description,
      location: value.location,
      date: value.date,
      start_time: value.start_time,
      end_time: value.end_time,
      seats: value.seats,
      organizer: value.organizers,
      price: value.price,
      isPublished: value.isPublished || event.isPublished, // preserve existing if not provided
      images: imageUrls.length > 0 ? imageUrls : event.images, // preserve existing if not provided
    };

    // Update the event in the database
    const result = await Models.Event.updateOne(
      { _id: req.params.id, creator: req.userId },
      { $set: updatedEvent }
    );

    if (result.modifiedCount === 0) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: MSG_NO_CHANGES_MADE,
      });
    }
    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: result,
      message: COMMON_MSG.UPDATED_SUCCESS.replace('##', 'Event'),
    });
  } catch (error) {
    console.error(`updateEventHandler error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Delete Event
async function deleteEventHandler(req, res) {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      creator: req.userId,
    });

    if (!event) {
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', 'Event') });
    }

    // Decrement event count
    // await Models.User.findByIdAndUpdate(req.user.id, {
    //   $inc: { 'subscription.eventsCreated': -1 },
    // });

    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: result,
      message: COMMON_MSG.DELETED_SUCCESS.replace('##', 'Event'),
    });
  } catch (error) {
    console.error(`deleteEventHandler error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Get All Created Event (manager specific - my events)
async function getUserCreatedEventsHandler(req, res) {
  try {
    const user = await Models.User.findOne({
      _id: req.userId,
      user_type: ROLE[1],
    });
    if (!user) {
      return res.status(STATUS_NOT_FOUND).json({
        success: false,
        message: INACTIVE_USER,
      });
    }
    const events = await Models.Event.find({ creator: req.userId })
      .sort('-date')
      .populate('creator', 'email');

    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: events,
      total: events.length,
      message: COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Events'),
    });
  } catch (error) {
    console.error(`getUserCreatedEventsHandler error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Get Event Details
async function getEventDetailsHandler(req, res) {
  try {
    const events = await Models.Event.find({ _id: req.params.id });

    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: events,
      message: COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Event'),
    });
  } catch (error) {
    console.error(`getEventDetailsHandler error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Get Published Events
async function getPublishedEventsHandler(req, res) {
  try {
    const events = await Models.Event.find({
      isPublished: true,
      date: { $gte: new Date() },
    }).sort('date');

    return res.status(STATUS_SUCCESS).json({
      success: true,
      data: events,
      total: events.length,
      message: COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Events'),
    });
  } catch (error) {
    console.error(`getPublishEventsHandler error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

module.exports = {
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getEventDetailsHandler,
  getPublishedEventsHandler,
  getUserCreatedEventsHandler,
};
