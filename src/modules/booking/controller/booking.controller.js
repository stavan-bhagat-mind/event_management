const Models = require('../../../models/index');
require('dotenv').config();

const {
  successResponseData,
  errorResponseData,
  errorResponseWithoutData,
  validationErrorResponseData,
  successResponseWithoutData,
} = require('../../../utils/response');
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  INACTIVE_USER,
  MSG_NO_CHANGES_MADE,
} = require('../../../utils/common/messages');
const {
  CATEGORY,
  ROLE,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
} = require('../../../utils/common/constants');
const FileService = require('../../../services/file.service');

// Get Booking Details
const getBookingDetailsHandler = async (req, res) => {
  try {
    const booking = await Models.Booking.findById(req.params.id)
      .select('seatsBooked totalPrice status qrCode validationStatus')
      .populate({
        path: 'event',
        select: 'title date location price startTime images',
      })
      .populate({ path: 'user', select: 'firstName lastName contactNumber' })
      .populate({ path: 'payment', select: 'transactionId status' });
    if (!booking) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', CATEGORY.BOOKING)
      );
    }
    if (booking.event && booking.event.images) {
      booking.event.images = booking.event.images.map((path) =>
        FileService.getFullUrl(path)
      );
    }
    return successResponseData(
      res,
      booking,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', CATEGORY.BOOKING),
      { total: booking.length }
    );
  } catch (error) {
    console.error(`getBookingDetails error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

// Get All Booking List
const getBookingListHandler = async (req, res) => {
  try {
    const bookings = await Models.Booking.find({
      user: req.userId,
      status: 'CONFIRMED',
    })
      .select('seatsBooked totalPrice status updatedAt')
      .populate({
        path: 'event',
        select: 'title date location price images',
      })
      .populate({ path: 'user', select: 'firstName lastName' })
      .populate({
        path: 'payment',
        select: 'transactionId status',
      });
    if (!bookings) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', CATEGORY.BOOKING)
      );
    }

    const modifiedBookings = bookings.map((booking) => {
      const event = booking?.event;

      const modifiedImages = event?.images?.map((path) =>
        FileService.getFullUrl(path)
      );

      return {
        ...booking.toObject(),
        event: {
          ...event.toObject(),
          images: modifiedImages,
        },
      };
    });

    return successResponseData(
      res,
      modifiedBookings,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', CATEGORY.BOOKING),
      { total: modifiedBookings.length }
    );
  } catch (error) {
    console.error(`getBookingListHandler error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

// Get Booking details,(Manager)
const getEventAttendeeListHandler = async (req, res) => {
  try {
    const booking = await Models.Booking.find({
      event: req.params.id,
      status: 'CONFIRMED',
    })
      .select('seatsBooked totalPrice status validationStatus')
      .populate({
        path: 'event',
        select: 'title date location price startTime images',
      })
      .populate({ path: 'user', select: 'firstName lastName contactNumber' })
      .populate({ path: 'payment', select: 'transactionId status updatedAt' });

    if (!booking) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', CATEGORY.BOOKING)
      );
    }
    const modifiedBookings = booking.map((booking) => {
      const event = booking?.event;

      const modifiedImages = event?.images?.map((path) =>
        FileService.getFullUrl(path)
      );

      return {
        ...booking.toObject(),
        event: {
          ...event.toObject(),
          images: modifiedImages,
        },
      };
    });

    return successResponseData(
      res,
      modifiedBookings,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', CATEGORY.BOOKING),
      { total: booking.length }
    );
  } catch (error) {
    console.error(`getBookingDetails error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
};

// validate qr for the event
const validateQRCodeHandler = async (req, res) => {
  {
    try {
      const bookingId = req.params.id;
      const booking = await Models.Booking.findById(bookingId)
        .select('seatsBooked totalPrice status validationStatus')
        .populate({
          path: 'event',
          select: 'title date location price startTime images',
        })
        .populate({
          path: 'user',
          select: 'firstName lastName contactNumber profilePictureUrl',
        })
        .populate({
          path: 'payment',
          select: 'transactionId status updatedAt',
        });

      if (!booking) {
        return res.status(404).render('ticketNotFound.template.ejs', {
          message: 'Ticket not found',
        });
      }

      // Render the ticket details page

      return res.render('ticket.template.ejs', {
        booking,
        user: booking.user,
        event: booking.event,
        seats: booking.seatsBooked,
        userProfile: FileService.getFullUrl(booking.user.profilePictureUrl),
      });
    } catch (error) {
      console.error('Error displaying ticket:', error);
      res.status(500).render('error.template.ejs', {
        message: 'Oops Something went wrong,please try again later',
      });
    }
  }
};

module.exports = {
  // createBookingHandler,
  getBookingDetailsHandler,
  validateQRCodeHandler,
  getBookingListHandler,
  getEventAttendeeListHandler,
};
