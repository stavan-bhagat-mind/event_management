const mongoose = require('mongoose');
require('dotenv').config();
const dbUri = process.env.MONGO_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(dbUri);
    console.log('MongoDB connected');
  } catch (error) {
    console.error(`MongoDB connection failed: ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
