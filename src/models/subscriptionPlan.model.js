const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      enum: ['monthly', 'yearly', 'lifetime'],
    },
    maxEvents: {
      type: Number,
      required: true,
      // -1 means unlimited
      validate: {
        validator: function (value) {
          return value >= -1;
        },
        message: 'maxEvents must be -1 (unlimited) or a positive number',
      },
    },
    duration: {
      type: Number,
      required: true, // total days in the plan
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    features: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
