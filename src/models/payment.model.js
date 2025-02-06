const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
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
      required: true, // Universal ID for both Stripe and IAP
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
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
