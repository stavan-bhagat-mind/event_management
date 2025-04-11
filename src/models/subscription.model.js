const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    originalTransactionId: {
      type: String,
      required: true,
      unique: true,
    },
    productId: {
      type: String,
      enum: ['com.monthly', 'com.yearly'],
      required: true,
    },
    purchaseDate: { type: Date, required: true },
    expiresDate: { type: Date, required: true },
    isTrial: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    autoRenewStatus: { type: Boolean, default: false },
    lastVerified: { type: Date, default: Date.now },
    environment: { type: String, enum: ['Sandbox', 'Production'] },
    latestReceipt: { type: String },
    pendingRenewalInfo: {
      autoRenewProductId: String,
      autoRenewStatus: Boolean,
      expirationIntent: Number,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'canceled', 'past_due', 'paused', 'trial'],
      default: 'active',
    },
    cancellationReason: { type: String },
  },
  {
    timestamps: true,
    indexes: [
      { user: 1, originalTransactionId: 1, unique: true },
      { user: 1, isActive: 1 },
      { expiresDate: 1 },
      { status: 1 },
    ],
    // versionKey: false,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
