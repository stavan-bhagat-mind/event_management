const Models = require('../../../models/index');
const FileService = require('../../../services/file.service');
const jwt = require('jsonwebtoken');
const {
  validateEventData,
} = require('../../../modules/events/validations/event.validations');
// const { USER } = require('../utils/user.constants');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  MSG_BAD_REQUEST,
  PASSWORD_RESET_SUCCESS,
  MSG_ACCESS_TOKEN_REFRESHED,
  VERIFICATION_EMAIL_SENT,
  MSG_VERIFY_EMAIL,
  MSG_RESET_PASSWORD_EMAIL_SENT,
} = require('../../../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_STATUS_CONFLICT,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
  STATUS_FORBIDDEN,
} = require('../../../utils/common/constants');

// Register User
async function createEventHandler(req, res) {
  try {
    // validate user input
    const { success, value } = validateEventData(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }

    const event = new Event({
      title: value.title,
      description: value.description,
      images: [],
      location: value.location,
      date: value.date,
      seats: {
        total: value.total,
      },
      creator: req.user.id,
      isPublished: req.user.subscription.planType !== 'trial',
    });

    await event.save();

    // Update user's event count
    // await User.findByIdAndUpdate(req.user.id, {
    //   $inc: { 'subscription.eventsCreated': 1 },
    // });
    return res.status(201).json({
      success: true,
      data: event,
    });
  } catch (err) {
    console.error(`Registration error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

module.exports = { createEventHandler };
