const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  transactionId: {
    type: String,
    required: true,
  },
  status: {
    type: Object,
    required: true,
    type: {
      type: String,
    },
    enum: ['SUCCESS', 'FAILED', 'PENDING'],
  },
});

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    eventsCreated: {
      type: Number,
      default: 0,
    },
    paymentHistory: {
      type: [paymentHistorySchema],
      default: [],
    },
    isFreeTrial: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
      default: 'ACTIVE',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// compound index to ensure a user can only have one active subscription at a time
userSubscriptionSchema.index(
  { userId: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'ACTIVE' } }
);

// Methods for the userSubscription schema
userSubscriptionSchema.methods.isActive = function () {
  return this.status === 'ACTIVE' && new Date() <= this.endDate;
};

userSubscriptionSchema.methods.canCreateEvent = function () {
  if (!this.isActive()) return false;

  // Get related subscription plan
  return this.populate('planId').then(() => {
    // If free trial, always allow event creation (publishing will be handled separately)
    if (this.isFreeTrial) return true;

    // If unlimited events (-1)
    if (this.planId.maxEvents === -1) return true;

    // Otherwise check against limit
    return this.eventsCreated < this.planId.maxEvents;
  });
};

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);    
