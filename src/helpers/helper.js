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

module.exports = { generateOTP, generateQRCode };
