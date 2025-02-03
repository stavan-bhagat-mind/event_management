const crypto = require('crypto');
const generateOTP = (length = 6) => {
  // Generate a random  OTP
  return crypto.randomInt(100000, 999999).toString();

//   Generate alphanumeric token 
//   return crypto.randomBytes(32).toString('hex');
};

module.exports = { generateOTP };
