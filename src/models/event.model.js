const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Event title is required'],
    },
    description: String,
    images: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      required: [true, 'Event location is required'],
    },
    date: {
      type: String,
      required: [true, 'Event date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date format must be YYYY-MM-DD'],
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Time format must be HH:MM in 24-hour format',
      ],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [
        /^([01]\d|2[0-3]):([0-5]\d)$/,
        'Time format must be HH:MM in 24-hour format',
      ],
      validate: {
        validator: function (value) {
          return value > this.startTime;
        },
        message: 'End time must be after start time',
      },
    },
    seats: {
      total: {
        type: Number,
        required: [true, 'Total seats count is required'],
        min: [1, 'Minimum 1 seat required'],
      },
      booked: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organizer: {
      type: String,
      required: [true, 'Organizer is required'],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    version: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Event', eventSchema);
