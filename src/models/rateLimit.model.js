const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema({
  identifier: String,
  actionType: String, // (like "reset-password","email-verify")
  attempts: { type: Number, default: 1 },
  lastAttempt: { type: Date, default: Date.now },
});

rateLimitSchema.index({ identifier: 1, actionType: 1 });
// This will automatically delete documents 1 hour after their lastAttempt
rateLimitSchema.index({ lastAttempt: 1 }, { expireAfterSeconds: 60 * 60 });
module.exports = mongoose.model('RateLimit', rateLimitSchema);
