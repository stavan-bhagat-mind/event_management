const Models = require('../../../models/index');
require('dotenv').config();
const { generateQRCode } = require('../../../helpers/helper');
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

// Create a new booking
// const createBookingHandler = async (req, res) => {
//   try {
//     const { eventId, seatsBooked, totalAmount, paymentData } = req.body;
//     const paymentInfo = {
//       ...paymentData,
//       created: new Date(paymentData.created * 1000),
//     };
//     const userId = req.userId;

//     // Validate input
//     if (!eventId || !seatsBooked || seatsBooked <= 0) {
//       return res.status(STATUS_BAD_REQUEST).json({
//         success: false,
//         message: 'Invalid input: eventId and seatsBooked are required',
//       });
//     }

//     // Check if event exists and is published
//     const event = await Event.findById(eventId);
//     if (!event || !event.isPublished) {
//       return res.status(STATUS_NOT_FOUND).json({
//         success: false,
//         message: 'Event not found or not published',
//       });
//     }
//     // Check seat availability

//     if (event.seats.booked + seatsBooked > event.seats.total) {
//       return res.status(STATUS_BAD_REQUEST).json({
//         success: false,
//         message: 'Not enough seats available',
//       });
//     }

//     // Calculate total price
//     // const totalPrice = event.price * seatsBooked;

//     // Generate QR code
//     // const qrCode = await generateQRCode(`${eventId}-${userId}-${Date.now()}`);

//     // Create booking
//     const booking = new Models.Booking({
//       event: eventId,
//       user: userId,
//       seatsBooked,
//       totalPrice,
//       qrCode,
//     });

//     // Update event's booked seats
//     event.seats.booked += seatsBooked;
//     await event.save();

//     // Save booking
//     await booking.save();

//     res.status(STATUS_SUCCESS).json({
//       success: true,
//       data: booking,
//       message: COMMON_MSG.CREATED_SUCCESS.replace('##', 'Booking'),
//     });
//   } catch (error) {
//     console.error(`createBooking error: ${error.message}`);
//     res.status(STATUS_INTERNAL_SERVER_ERROR).json({
//       success: false,
//       message: MSG_INTERNAL_SERVER_ERROR,
//     });
//   }
// };

// Get Booking Details
const getBookingDetailsHandler = async (req, res) => {
  try {
    const booking = await Models.Booking.findById(req.params.id)
      .select('seatsBooked totalPrice status qrCode validationStatus')
      .populate({
        path: 'event',
        select: 'title date location price startTime',
      })
      .populate({ path: 'user', select: 'firstName lastName contactNumber' })
      .populate({ path: 'payment', select: 'transactionId status' });
    if (!booking) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'Booking')
      );
    }

    return successResponseData(
      res,
      booking,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Booking'),
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
    const booking = await Models.Booking.find({ user: req.userId })
      .select('seatsBooked totalPrice status')
      .populate({
        path: 'event',
        select: 'title date location price',
      })
      .populate({ path: 'user', select: 'firstName lastName' })
      .populate({
        path: 'payment',
        select: 'transactionId status',
      });
    if (!booking) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'Booking')
      );
    }

    return successResponseData(
      res,
      booking,
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', 'Booking'),
      { total: booking.length }
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
// validate qr for the event

const validateQRCodeHandler = async (req, res) => {};

module.exports = {
  // createBookingHandler,
  getBookingDetailsHandler,
  validateQRCodeHandler,
  getBookingListHandler,
};
