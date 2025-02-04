const Models = require('../../../models/index');
const FileService = require('../../../services/file.service');
const bcrypt = require('bcrypt');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const {
  validateUserRegister,
  validateLogin,
  validateUserUpdate,
  validateResetPassword,
} = require('../../../modules/user/validations/user.validations');
const { USER } = require('../utils/user.constants');
const { USER_MESSAGE } = require('../utils/user.messages');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  MSG_BAD_REQUEST,
  PASSWORD_RESET_SUCCESS,
  MSG_ACCESS_TOKEN_REFRESHED,
  VERIFICATION_EMAIL_SENT,
  MSG_VERIFY_EMAIL,
  MSG_RESET_PASSWORD_EMAIL_SENT,
} = require('../../../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_STATUS_CONFLICT,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
  STATUS_FORBIDDEN,
} = require('../../../utils/common/constants');
const {
  sendVerificationEmail,
  sendResetPasswordEmail,
} = require('../../../config/email.config');
const { generateOTP } = require('../../../helpers/helper');

// Register User
async function registerHandler(req, res) {
  try {
    // validate user input
    const { success, value } = validateUserRegister(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }
    // Check for existing user
    const existingUser = await Models.User.findOne({ email: value.email });
    if (existingUser) {
      return res.status(STATUS_STATUS_CONFLICT).json({
        success: false,
        message: COMMON_MSG.ALREADY_EXISTS.replace('##', USER),
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);
    const emailVerificationToken = jwt.sign(
      { email: value.email },
      process.env.VERIFY_SECRET,
      { expiresIn: process.env.VERIFY_EXPIRY_TIME }
    );
    // Create user
    const user = await Models.User.create({
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      user_type: value.user_type,
      password: hashedPassword,
    });

    await sendVerificationEmail(user.email, emailVerificationToken);
    // Remove sensitive data from response
    const userResponse = {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      is_email_verified: user.is_email_verified,
      created_at: user.createdAt,
    };

    return res.status(201).json({
      success: true,
      data: userResponse,
      message: MSG_VERIFY_EMAIL,
    });
  } catch (error) {
    console.error(`Registration error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// User Login
async function loginHandler(req, res) {
  try {
    const { success, value } = validateLogin(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }
    // Find user
    const user = await Models.User.findOne({ email: value.email });
    if (!user) {
      return res.status(STATUS_NOT_FOUND).json({
        success: false,
        message: COMMON_MSG.NOT_FOUND.replace('##', USER),
      });
    }
    if (!user.is_email_verified) {
      return res.status(STATUS_FORBIDDEN).json({
        success: false,
        message: MSG_VERIFY_EMAIL,
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(value.password, user.password);

    if (!isMatch) {
      return res.status(STATUS_NOT_FOUND).json({
        success: false,
        message: USER_MESSAGE.INVALID_CREDENTIALS,
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY_TIME }
    );
    const refreshToken = jwt.sign(
      {
        data: { email: user.email, id: user._id },
      },
      process.env.JWT_REFRESH_KEY,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE_TIME }
    );
    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.first_name + ' ' + user.last_name,
        email: user.email,
        user_type: user.user_type,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Generate new access token
async function refreshTokenHandler(req, res) {
  const refreshToken = req.headers['refresh-token'];

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);

    const newAccessToken = jwt.sign(
      { email: decoded.email },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRY_TIME,
      }
    );

    return res.status(STATUS_SUCCESS).json({
      message: MSG_ACCESS_TOKEN_REFRESHED,
      accessToken: newAccessToken,
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res
        .status(STATUS_UNAUTHORIZED)
        .json({ message: MSG_REFRESH_TOKEN_EXPIRED });
    } else if (error.name === 'JsonWebTokenError') {
      return res
        .status(STATUS_UNAUTHORIZED)
        .json({ message: MSG_INVALID_REFRESH_TOKEN });
    } else {
      console.error('Error refreshing access token:', error);
      return res
        .status(STATUS_INTERNAL_SERVER_ERROR)
        .json({ message: MSG_INTERNAL_SERVER_ERROR });
    }
  }
}

// Get User Data
async function getUserDataHandler(req, res) {
  try {
    const userId = req.userId;
    const user = await Models.User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error(`Get user data error: ${error.message}`);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// verify User
async function userVerificationHandler(req, res) {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.VERIFY_SECRET);
    const user = await Models.User.findOne({ email: decoded.email });
    if (!user) {
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', USER) });
    }
    if (user.is_email_verified) {
      return res
        .status(STATUS_BAD_REQUEST)
        .json({ message: COMMON_MSG.VERIFIED_SUCCESS.replace('##', 'email') });
    }
    user.is_email_verified = true;
    await user.save();
    return res
      .status(STATUS_SUCCESS)
      .json({ message: COMMON_MSG.VERIFIED_SUCCESS.replace('##', 'email') });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Resend Verification Email
async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await Models.User.findOne({ email });

    if (!user) {
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', USER) });
    }

    if (user.is_email_verified) {
      return res
        .status(STATUS_BAD_REQUEST)
        .json({ message: COMMON_MSG.ALREADY_VERIFIED.replace('##', 'email') });
    }

    const emailVerificationToken = jwt.sign(
      { email },
      process.env.VERIFY_SECRET,
      { expiresIn: process.env.VERIFY_EXPIRY_TIME }
    );
    // Send new verification email
    await sendVerificationEmail(email, emailVerificationToken);

    res.status(STATUS_SUCCESS).json({ message: VERIFICATION_EMAIL_SENT });
  } catch (error) {
    console.error('Resend verification email error:', error);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Update User Profile
async function updateUserProfileHandler(req, res) {
  try {
    // validate user input
    const userId = req.userId;
    const { success, value } = validateUserUpdate(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }

    const user = await Models.User.findById(userId);
    if (!user) {
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', USER) });
    }

    const updateFields = {
      first_name: value.first_name,
      last_name: value.last_name,
      contact_number: value.contact_number,
    };

    if (value.password) {
      updateFields.password = await bcrypt.hash(value.password, 10);
    }

    // Process file upload
    if (req.file) {
      // Upload to MinIO
      const fileData = await FileService.uploadFile(req.file);
      updateFields.profile_picture_url = fileData.url;
      updateFields.metadata = {
        object_name: fileData.objectName,
        bucket: process.env.MINIO_BUCKET,
      };
    }

    const updatedUser = await Models.User.findByIdAndUpdate(
      userId,
      updateFields,
      {
        new: true,
      }
    );

    res.status(STATUS_SUCCESS).json({
      message: COMMON_MSG.UPDATED_SUCCESS.replace('##', USER),
      updatedUser,
    });
  } catch (error) {
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Forgot Password
async function forgotPasswordHandler(req, res) {
  try {
    const { email } = req.body;
    const user = await Models.User.findOne({ email });

    if (!user) {
      return res
        .status(STATUS_NOT_FOUND)
        .json({ message: COMMON_MSG.NOT_FOUND.replace('##', USER) });
    }
    // generate OTP
    const resetPasswordToken = generateOTP();
    // Set expiry time
    const resetTokenExpiry = moment().add(30, 'minutes').toDate();
    user.reset_password_token = resetPasswordToken;
    user.reset_password_expiry = resetTokenExpiry;
    await user.save();

    // Send reset password email
    await sendResetPasswordEmail(
      user.email,
      resetPasswordToken,
      user.first_name
    );

    res.status(STATUS_SUCCESS).json({
      message: MSG_RESET_PASSWORD_EMAIL_SENT,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

// Reset Password
async function verifyAndResetPasswordHandler(req, res) {
  try {
    const { value, success } = validateResetPassword(req.body, res);
    if (!success) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: value.message,
      });
    }

    // Find user and verify OTP
    const user = await Models.User.findOne({
      email: value.email,
      reset_password_token: value.otp,
      reset_password_expiry: { $gt: new Date() }, // Check if token hasn't expired
    });

    if (!user) {
      return res.status(STATUS_BAD_REQUEST).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Update user's password and clear reset token fields
    user.password = hashedPassword;
    user.reset_password_token = null;
    user.reset_password_expiry = null;

    await user.save();

    res.status(STATUS_SUCCESS).json({
      success: true,
      message: PASSWORD_RESET_SUCCESS,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(STATUS_INTERNAL_SERVER_ERROR).json({
      success: false,
      message: MSG_INTERNAL_SERVER_ERROR,
    });
  }
}

module.exports = {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  getUserDataHandler,
  userVerificationHandler,
  resendVerificationEmail,
  updateUserProfileHandler,
  forgotPasswordHandler,
  verifyAndResetPasswordHandler,
};
