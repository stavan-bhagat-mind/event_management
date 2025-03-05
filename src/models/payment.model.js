const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
    },
    paymentIntentId: {
      type: String,
      required: false, // Only for Stripe payments
    },
    transactionId: {
      type: String,
      required: false, // Universal ID for both Stripe and IAP
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'usd',
    },
    paymentMethod: {
      type: String,
      enum: ['STRIPE', 'IAP'],
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
    },
    metadata: {
      type: Map,
      of: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    idempotencyKey: {
      type: String,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
