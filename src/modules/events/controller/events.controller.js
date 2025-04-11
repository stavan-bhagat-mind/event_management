const Models = require('../../../models/index');
const mongoose = require('mongoose');
const {
  successResponseData,
  errorResponseWithoutData,
  validationErrorResponseData,
  successResponseWithoutData,
} = require('../../../utils/response');
const FileService = require('../../../services/file.service');
const {
  validateEventData,
  validateId,
} = require('../../../modules/events/validations/event.validations');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  INACTIVE_USER,
  MSG_MODIFICATION_RESTRICTED,
} = require('../../../utils/common/messages');
const { ROLE } = require('../../../utils/common/constants');
const {
  CATEGORY,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
  STATUS_FORBIDDEN,
  STATUS_CREATED,
} = require('../../../utils/common/constants');
const {
  EVENT,
  SAVED_EVENT,
  TRIAL_EVENT,
} = require('./../utils/events.constant');
const { transformEventWithUrls } = require('../../../helpers/helper');

// Create Event
async function createEventHandler(req, res) {
  try {
    const { success, value } = validateEventData(req.body, res);
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }

    // ObjectId - use for both file storage and event creation
    const eventId = new mongoose.Types.ObjectId();

    const imagePaths = [];

    // Process file uploads using the pre-generated event ID
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileData = await FileService.uploadFile(file, {
          category: CATEGORY.EVENT,
          subCategory: eventId.toString(),
        });
        imagePaths.push(fileData.objectPath);
      }
    }
    //context from subscription middleware
    const isTrialEvent = req.eventCreationContext.isTrialEvent;
    const isPublished = req.eventCreationContext.isPublished;

    // Create event with all data including images in one operation
    const event = await Models.Event.create({
      _id: eventId,
      title: value.title,
      description: value.description,
      images: imagePaths,
      location: value.location,
      date: value.date,
      startTime: value.startTime,
      endTime: value.endTime,
      seats: {
        total: value.seats,
      },
      creator: req.userId,
      organizer: value.organizer,
      price: value.price,
      isPublished: isPublished,
      // createdDuringTrial: isTrialEvent,
    });

    // response with full URLs
    const responseData = {
      ...event.toObject(),
      images: event.images.map((path) => FileService.getFullUrl(path)),
    };
    // Customize success message based on event creation context
    const successMessage = isTrialEvent
      ? COMMON_MSG.CREATED_SUCCESS.replace('##', TRIAL_EVENT)
      : COMMON_MSG.CREATED_SUCCESS.replace('##', EVENT);

    return successResponseData(
      res,
      responseData,
      STATUS_CREATED,
      successMessage
    );
  } catch (error) {
    console.error(`createEventHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

//Update Event
async function updateEventHandler(req, res) {
  try {
    const { success, value } = validateEventData(req.body, res);
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }

    const event = await Models.Event.findOne({
      _id: req.params.id,
      creator: req.userId,
    });

    if (!event) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', EVENT)
      );
    }

    // Check for existing bookings associated with the event
    const existingBookings = await Models.Booking.findOne({
      event: event._id,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    // If there are existing bookings, prevent the update
    if (existingBookings) {
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        MSG_MODIFICATION_RESTRICTED.replace('##', 'update').replace(
          '@@',
          'bookings'
        )
      );
    }
    // Handle existing images - they will be full URLs from frontend
    const keepImagePaths = JSON.parse(req.body.existingImages || '[]').map(
      (url) => FileService.getObjectPathFromUrl(url)
    );

    // Delete removed images
    const imagesToDelete = event.images.filter(
      (path) => !keepImagePaths.includes(path)
    );

    for (const path of imagesToDelete) {
      try {
        await FileService.deleteFile(path);
      } catch (error) {
        console.error(`Failed to delete image ${path}:`, error);
      }
    }

    // Upload new images using event ID
    const newImagePaths = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileData = await FileService.uploadFile(file, {
          category: CATEGORY.EVENT,
          subCategory: event._id.toString(),
        });
        newImagePaths.push(fileData.objectPath);
      }
    }

    // Combine kept and new image paths
    const finalImagePaths = [...keepImagePaths, ...newImagePaths];

    // Update event with single operation
    const updatedEvent = await Models.Event.findByIdAndUpdate(
      event._id,
      {
        title: value.title,
        description: value.description,
        images: finalImagePaths,
        location: value.location,
        date: value.date,
        startTime: value.startTime,
        endTime: value.endTime,
        seats: {
          total: value.seats,
        },
        organizer: value.organizer,
        price: value.price,
        isPublished: value.isPublished ?? event.isPublished,
      },
      { new: true }
    );

    // Prepare response with full URLs
    const responseData = {
      ...updatedEvent.toObject(),
      images: updatedEvent.images.map((path) => FileService.getFullUrl(path)),
    };

    return successResponseData(
      res,
      responseData,
      STATUS_SUCCESS,
      COMMON_MSG.UPDATED_SUCCESS.replace('##', EVENT)
    );
  } catch (error) {
    console.error(`updateEventHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Delete Event Handler
async function deleteEventHandler(req, res) {
  try {
    const { success, value } = validateId({ id: req.params.id });
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }
    const event = await Models.Event.findOne({
      _id: value.id,
      creator: req.userId,
    });

    if (!event) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', EVENT)
      );
    }

    // Check for existing bookings associated with the event
    const existingBookings = await Models.Booking.findOne({
      event: event._id,
      status: { $in: ['PENDING', 'CONFIRMED'] },
    });

    // If there are existing bookings, prevent the deletion
    if (existingBookings) {
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        MSG_MODIFICATION_RESTRICTED.replace('##', 'delete').replace(
          '@@',
          'bookings'
        )
      );
    }
    // Delete images from MinIO - we already have paths stored
    if (event.images && event.images.length > 0) {
      for (const imagePath of event.images) {
        try {
          await FileService.deleteFile(imagePath);
        } catch (error) {
          console.error(
            `Failed to delete image from storage: ${error.message}`
          );
        }
      }
    }

    await Models.Event.deleteOne({ _id: req.params.id, creator: req.userId });

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      COMMON_MSG.DELETED_SUCCESS.replace('##', EVENT)
    );
  } catch (error) {
    console.error(`deleteEventHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Get All Created Event (manager specific - my events)
async function getUserCreatedEventsHandler(req, res) {
  try {
    const user = await Models.User.findOne({
      _id: req.userId,
      userType: ROLE[1],
    });
    if (!user) {
      return errorResponseWithoutData(res, STATUS_NOT_FOUND, INACTIVE_USER);
    }
    const events = await Models.Event.find({ creator: req.userId })
      .select('-createdDuringTrial')
      .sort('-date')
      .populate('creator', 'email');

    const transformedEvents = events.map(transformEventWithUrls);

    return successResponseData(
      res,
      transformedEvents,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', EVENT),
      { total: events.length }
    );
  } catch (error) {
    console.error(`getUserCreatedEventsHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Get Event Details
async function getEventDetailsHandler(req, res) {
  try {
    const { success, value } = validateId({ id: req.params.id });
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }
    const event = await Models.Event.findById(value.id).select(
      '-createdDuringTrial'
    );

    const transformedEvent = transformEventWithUrls(event);

    return successResponseData(
      res,
      transformedEvent,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', EVENT)
    );
  } catch (error) {
    console.error(`getEventDetailsHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Get Published Events
async function getPublishedEventsHandler(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const events = await Models.Event.find({
      isPublished: true,
      date: { $gte: today },
    })
      .select('-createdDuringTrial')
      .sort('date');

    // Transform events to include full image URLs
    const transformedEvents = events.map(transformEventWithUrls);

    return successResponseData(
      res,
      transformedEvents,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', EVENT),
      { total: events.length }
    );
  } catch (error) {
    console.error(`getPublishedEventsHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Get All Published Events (finished + upcoming)
async function getAllPublishedEventsHandler(req, res) {
  try {
    const events = await Models.Event.find({
      isPublished: true,
    })
      .select('-version')
      .sort('date');

    // Transform events to include full image URLs
    const transformedEvents = events.map(transformEventWithUrls);

    return successResponseData(
      res,
      transformedEvents,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', EVENT),
      { total: events.length }
    );
  } catch (error) {
    console.error(`getPublishedEventsHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// ------------------------------------saved event-----------------------------------------

// save Events
async function saveEventHandler(req, res) {
  try {
    const userId = req.userId;
    const { eventId } = req.body;

    const event = await Models.Event.findById(eventId);

    if (!event) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', EVENT)
      );
    }
    const savedEvent = await Models.SavedEvent.create({
      user: userId,
      event: eventId,
    });

    return successResponseData(
      res,
      savedEvent,
      STATUS_SUCCESS,
      COMMON_MSG.ADDED_SUCCESS.replace('##', EVENT)
    );
  } catch (error) {
    if (error.code === 11000) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.ALREADY_EXISTS.replace('##', EVENT)
      );
    }
    console.error(`saveEventHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// removeSavedEventHandler
async function removeSavedEventHandler(req, res) {
  try {
    const savedEvent = await Models.SavedEvent.findOne({
      _id: req.params.id,
      user: req.userId,
    });

    if (!savedEvent) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', SAVED_EVENT)
      );
    }

    await Models.SavedEvent.deleteOne({
      _id: req.params.id,
      user: req.userId,
    });

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      COMMON_MSG.REMOVED_SUCCESS.replace('##', EVENT)
    );
  } catch (error) {
    console.error(`removeSavedEventHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Get Saved Events Details
async function getSavedEventsHandler(req, res) {
  try {
    const userId = req.userId;
    const savedEvent = await Models.SavedEvent.find({
      user: userId,
    }).populate({
      path: 'event',
      model: 'Event',
    });

    if (!savedEvent) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', SAVED_EVENT)
      );
    }
    return successResponseData(
      res,
      savedEvent,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', EVENT),
      { total: savedEvent.length }
    );
  } catch (error) {
    console.error(`getSavedEventsHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}
module.exports = {
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
  getEventDetailsHandler,
  getPublishedEventsHandler,
  getAllPublishedEventsHandler,
  getUserCreatedEventsHandler,
  saveEventHandler,
  removeSavedEventHandler,
  getSavedEventsHandler,
};
