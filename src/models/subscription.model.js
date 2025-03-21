const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    originalTransactionId: { type: String, required: true, unique: true },
    productId: { type: String, required: true },
    purchaseDate: { type: Date, required: true },
    expiresDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELED', 'IN_GRACE_PERIOD'],
      default: 'active',
    },
    environment: {
      type: String,
      enum: ['sandbox', 'production'],
      required: true,
    },
    trialEndDate: Date,
    eventsCreated: { type: Number, default: 0 },
    latestReceipt: String,
    verificationData: Object,
    lastVerified: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
