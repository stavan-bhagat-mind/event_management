const eventSchema = new mongoose.Schema({
  title: String,
  description: String,
  images: { type: [String], default: [] },
  location: String,
  date: Date,
  seats: {
    total: Number,
    booked: { type: Number, default: 0 },
  },
  price: { type: Number, required: true, min: 0 },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublished: { type: Boolean, default: false },
});
    