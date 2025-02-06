const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    first_name: {
      type: String,
      required: true,
      maxlength: 50,
    },
    last_name: {
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
    is_subscribed: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      required: true,
    },
    reset_password_token: {
      type: String,
    },
    reset_password_expiry: {
      type: Date,
    },
    account_status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    user_type: {
      type: String,
      enum: ['attendee', 'event_manager'],
      required: true,
    },
    contact_number: {
      type: String,
      match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number'],
    },
    is_email_verified: {
      type: Boolean,
      default: false,
    },
    profile_picture_url: {
      type: String,
    },
    deleted_at: {
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
