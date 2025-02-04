const bookingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  qrCode: String,
  isValid: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});
