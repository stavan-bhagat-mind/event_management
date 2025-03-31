const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    originalTransactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
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
    cancellationReason: { type: String }, // For tracking why subscription ended
  },
  {
    timestamps: true,
    indexes: [{ expiresDate: 1 }, { user: 1, isActive: 1 }],
    // versionKey: false,
  }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
