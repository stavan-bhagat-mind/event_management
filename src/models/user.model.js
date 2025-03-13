const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      maxlength: 50,
    },
    lastName: {
      type: String,
      required: true,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please fill a valid email address',
      ],
    },
    isSubscribed: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: {
      type: String,
    },
    resetPasswordExpiry: {
      type: Date,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    userType: {
      type: String,
      enum: ['attendee', 'event_manager'],
      required: true,
    },
    contactNumber: {
      type: String,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    profilePictureUrl: {
      type: String,
    },
    metadata: {
      type: Map,
      of: String,
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Add indexes
userSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model('User', userSchema);
