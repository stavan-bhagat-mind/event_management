const mongoose = require('mongoose');

const savedEventSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  savedAt: {
    type: Date,
    default: Date.now,
  },
});

savedEventSchema.index({ user: 1, event: 1 }, { unique: true });
module.exports = mongoose.model('savedEvents', savedEventSchema);
  