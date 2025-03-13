const crypto = require('crypto');
const generateOTP = (length = 6) => {
  // Generate a random  OTP
  return crypto.randomInt(100000, 999999).toString();

  //   Generate alphanumeric token
  //   return crypto.randomBytes(32).toString('hex');
};

const QRCode = require('qrcode');
const generateQRCode = async (data) => {
  try {
    const qrCode = await QRCode.toDataURL(data);
    return qrCode;
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};

// Utility function to extract object path from full URL
const getObjectPathFromUrl = (url) => {
  const baseUrl = process.env.MINIO_PUBLIC_URL;
  const bucketName = process.env.MINIO_BUCKET;
  return url.replace(`${baseUrl}/${bucketName}/`, '');
};

// Utility function to construct full URL from object path
const getFullImageUrl = (objectPath) => {
  const baseUrl = process.env.MINIO_PUBLIC_URL;
  const bucketName = process.env.MINIO_BUCKET;
  return `${baseUrl}/${bucketName}/${objectPath}`;
};

// Function to generate a secure verification token
const generateVerificationToken = (bookingId) => {
  const crypto = require('crypto');
  const randomString = crypto.randomBytes(16).toString('hex');
  return `${bookingId}-${randomString}`;
};
// verifyReceipt function to verify the receipt data from Apple
const axios = require('axios');
require('dotenv').config();

const verifyReceipt = async (receiptData, isSandbox = true) => {
  const endpoint = isSandbox
    ? process.env.APPLE_ENDPOINT_SANDBOX
    : process.env.APPLE_ENDPOINT_PRODUCTION;

  const payload = {
    'receipt-data': receiptData,
    password: process.env.APP_SHARED_SECRET,
    'exclude-old-transactions': true,
  };

  try {
    const { data } = await axios.post(endpoint, payload);
    return data;
  } catch (error) {
    console.error('Error verifying receipt:', error);
    throw error;
  }
};

module.exports = { verifyReceipt };
module.exports = {
  generateOTP,
  generateQRCode,
  getObjectPathFromUrl,
  getFullImageUrl,
  generateVerificationToken,
};
