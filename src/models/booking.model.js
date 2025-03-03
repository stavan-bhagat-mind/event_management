const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    seatsBooked: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED'],
      default: 'PENDING',
    },
    qrCode: {
      type: String,
      required: false,
    },
    validationStatus: {
      type: String,
      enum: ['pending', 'validated', 'invalidated'],
      default: 'pending',
    },
    validationTime: Date,
    validationAttempts: {
      type: Number,
      default: 0,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);
bookingSchema.index({ eventId: 1, userId: 1 });
module.exports = mongoose.model('Booking', bookingSchema);
