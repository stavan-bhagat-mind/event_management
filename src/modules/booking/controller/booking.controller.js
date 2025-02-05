const Models = require('../../../models/index');
require('dotenv').config();
// const { generateQRCode } = require('../utils/qrCodeGenerator');
const { COMMON_MSG } = require('../constants/messages');

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
    const { eventId, seatsBooked } = req.body;
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
    const totalPrice = event.price * seatsBooked;

    // Generate QR code
    const qrCode = await generateQRCode(`${eventId}-${userId}-${Date.now()}`);

    // Create booking
    const booking = new Booking({
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
      message: 'Booking created successfully',
    });
  } catch (error) {
    console.error(`createBooking error: ${error.message}`);
    res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

module.exports = {
  createBookingHandler,
};
