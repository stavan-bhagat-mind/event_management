const Models = require('../../../models/index');
require('dotenv').config();
const { generateQRCode } = require('../../../helpers/helper');
const { COMMON_MSG } = require('../../../utils/common/messages');

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
const createBookingHandler = async (req, res) => {
  try {
    const { eventId, seatsBooked, totalAmount, paymentData } = req.body;
    const paymentInfo = {
      ...paymentData,
      created: new Date(paymentData.created * 1000),
    };
    const userId = req.userId;

    // Validate input
    if (!eventId || !seatsBooked || seatsBooked <= 0) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: 'Invalid input: eventId and seatsBooked are required',
      });
    }

    // Check if event exists and is published
    const event = await Event.findById(eventId);
    if (!event || !event.isPublished) {
      return res.status(STATUS_NOT_FOUND).json({
        success: false,
        message: 'Event not found or not published',
      });
    }

    // Check seat availability
    if (event.seats.booked + seatsBooked > event.seats.total) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: 'Not enough seats available',
      });
    }

    // Calculate total price
    // const totalPrice = event.price * seatsBooked;

    // Generate QR code
    // const qrCode = await generateQRCode(`${eventId}-${userId}-${Date.now()}`);

    // Create booking
    const booking = new Models.Booking({
      event: eventId,
      user: userId,
      seatsBooked,
      totalPrice,
      qrCode,
    });

    // Update event's booked seats
    event.seats.booked += seatsBooked;
    await event.save();

    // Save booking
    await booking.save();

    res.status(STATUS_SUCCESS).json({
      success: true,
      data: booking,
      message: COMMON_MSG.CREATED_SUCCESS.replace('##', 'Booking'),
    });
  } catch (error) {
    console.error(`createBooking error: ${error.message}`);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
};

// Get Booking Details
const getBookingDetailsHandler = async (req, res) => {
  try {
    const booking = await Models.Booking.findById(req.params.id)
      .populate('event', 'title date location')
      .populate('user', 'email name');

    if (!booking) {
      return res.status(STATUS_NOT_FOUND).json({
        success: false,
        message: COMMON_MSG.NOT_FOUND.replace('##', 'Booking'),
      });
    }

    res.status(STATUS_SUCCESS).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error(`getBookingDetails error: ${error.message}`);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
};

module.exports = {
  createBookingHandler,
  getBookingDetailsHandler,
};
