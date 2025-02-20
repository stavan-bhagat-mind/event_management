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

module.exports = {
  generateOTP,
  generateQRCode,
  getObjectPathFromUrl,
  getFullImageUrl,
};
