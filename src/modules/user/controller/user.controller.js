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
  validatePasswordUpdate,
} = require('../../../modules/user/validations/user.validations');
const {
  errorResponseWithoutData,
  successResponseData,
  validationErrorResponseData,
  successResponseWithoutData,
} = require('../../../utils/response');
const { USER } = require('../utils/user.constants');
const { USER_MESSAGE } = require('../utils/user.messages');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  MSG_BAD_REQUEST,
  MSG_LINK_EXPIRE,
  PASSWORD_RESET_SUCCESS,
  MSG_ACCESS_TOKEN_REFRESHED,
  VERIFICATION_EMAIL_SENT,
  MSG_VERIFY_EMAIL,
  MSG_RESET_PASSWORD_EMAIL_SENT,
} = require('../../../utils/common/messages');
const {
  CATEGORY,
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_STATUS_CONFLICT,
  STATUS_BAD_REQUEST,
  STATUS_NOT_FOUND,
  STATUS_SUCCESS,
  STATUS_CREATED,
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
      return validationErrorResponseData(res, value.message);
    }
    // Check for existing user
    const existingUser = await Models.User.findOne({ email: value.email });
    if (existingUser) {
      return errorResponseWithoutData(
        res,
        STATUS_STATUS_CONFLICT,
        COMMON_MSG.ALREADY_EXISTS.replace('##', USER)
      );
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
      firstName: value.firstName,
      lastName: value.lastName,
      email: value.email,
      userType: value.userType,
      password: hashedPassword,
      contactNumber: value.contactNumber,
    });

    await sendVerificationEmail(user.email, emailVerificationToken);
    // Remove sensitive data from response
    const userResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userType: user.userType,
      isEmailVerified: user.isEmailVerified,
      contactNumber: user.contactNumber,
      createdAt: user.createdAt,
    };

    return successResponseData(
      res,
      userResponse,
      STATUS_CREATED,
      MSG_VERIFY_EMAIL
    );
  } catch (error) {
    console.error(`Registration error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// User Login
async function loginHandler(req, res) {
  try {
    const { success, value } = validateLogin(req.body, res);
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }
    // Find user
    const user = await Models.User.findOne({ email: value.email });
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    }
    if (!user.isEmailVerified)
      return errorResponseWithoutData(res, STATUS_FORBIDDEN, MSG_VERIFY_EMAIL);

    // Check password
    const isMatch = await bcrypt.compare(value.password, user.password);

    if (!isMatch) {
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        USER_MESSAGE.INVALID_CREDENTIALS
      );
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.email },
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

    return successResponseData(
      res,
      {
        id: user._id,
        name: user.firstName + ' ' + user.lastName,
        email: user.email,
        userType: user.userType,
        token,
        refreshToken,
      },
      STATUS_SUCCESS,
      'User logged in successfully'
    );
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
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

    return successResponseData(
      res,
      newAccessToken,
      STATUS_SUCCESS,
      MSG_ACCESS_TOKEN_REFRESHED
    );
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
      errorResponseWithoutData(
        res,
        STATUS_INTERNAL_SERVER_ERROR,
        MSG_INTERNAL_SERVER_ERROR
      );
    }
  }
}

// Get User Data
async function getUserDataHandler(req, res) {
  try {
    const userId = req.userId;
    const user = await Models.User.findById(userId);
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'User')
      );
    }

    return successResponseData(
      res,
      {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        contactNumber: user.contactNumber,
        userType: user.userType,
        password: user.password,
        profilePictureUrl: user.profilePictureUrl,
      },
      STATUS_SUCCESS,
      COMMON_MSG.FETCHED_SUCCESS.replace('##', USER)
    );
  } catch (error) {
    console.error(`Get user data error: ${error.message}`);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// verify User
async function userVerificationHandler(req, res) {
  try {
    const { token } = req.params;
    const decoded = jwt.verify(token, process.env.VERIFY_SECRET);
    const user = await Models.User.findOne({ email: decoded.email });
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', 'User')
      );
    }
    if (user.isEmailVerified) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.VERIFIED_SUCCESS.replace('##', 'email')
      );
    }
    user.isEmailVerified = true;
    await user.save();
    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      COMMON_MSG.VERIFIED_SUCCESS.replace('##', 'email')
    );
  } catch (error) {
    console.error('Verification error:', error);
    if (error.name === 'TokenExpiredError') {
      return errorResponseWithoutData(res, STATUS_BAD_REQUEST, MSG_LINK_EXPIRE);
    }
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Resend Verification Email
async function resendVerificationEmail(req, res) {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await Models.User.findOne({ email });

    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    }

    if (user.isEmailVerified) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.ALREADY_VERIFIED.replace('##', 'email')
      );
    }

    const emailVerificationToken = jwt.sign(
      { email },
      process.env.VERIFY_SECRET,
      { expiresIn: process.env.VERIFY_EXPIRY_TIME }
    );
    // Send new verification email
    await sendVerificationEmail(email, emailVerificationToken);

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      VERIFICATION_EMAIL_SENT
    );
  } catch (error) {
    console.error('Resend verification email error:', error);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Update User Profile
async function updateUserProfileHandler(req, res) {
  try {
    // validate user input
    const userId = req.userId;
    const { success, value } = validateUserUpdate(req.body, res);
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }

    const user = await Models.User.findById(userId);
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    }

    const updateFields = {
      firstName: value.firstName,
      lastName: value.lastName,
      contactNumber: value.contactNumber,
    };

    // Process file upload
    if (req.file) {
      // Upload to MinIO
      const fileData = await FileService.uploadFile(req.file, {
        category: CATEGORY.USER,
        subCategory: userId,
      });
      updateFields.profilePictureUrl = fileData.url;
      updateFields.metadata = {
        object_name: fileData.objectName,
        bucket: process.env.MINIO_BUCKET,
      };
    }

    await Models.User.findByIdAndUpdate(userId, updateFields, {
      new: true,
    });
    console.log('user updated');

    return successResponseData(
      res,
      updateFields,
      STATUS_SUCCESS,
      COMMON_MSG.UPDATED_SUCCESS.replace('##', 'Profile')
    );
  } catch (error) {
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Update Password
async function updatePasswordHandler(req, res) {
  try {
    // validate user input
    const userId = req.userId;
    const { success, value } = validatePasswordUpdate(req.body, res);

    if (!success) {
      return validationErrorResponseData(res, value.message);
    }

    const user = await Models.User.findById(userId);
    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    }
    const isMatch = await bcrypt.compare(value.oldPassword, user.password);

    if (!isMatch) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        COMMON_MSG.INVALID.replace('##', 'Old Password')
      );
    }
    const hashedNewPassword = await bcrypt.hash(value.newPassword, 10);

    await Models.User.findByIdAndUpdate(userId, {
      password: hashedNewPassword,
    });
    console.log('password updated');

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      COMMON_MSG.UPDATED_SUCCESS.replace('##', 'Password')
    );
  } catch (error) {
    console.error('updatePasswordHandler :', error);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Forgot Password
async function forgotPasswordHandler(req, res) {
  try {
    const { email } = req.body;
    const user = await Models.User.findOne({ email });

    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_NOT_FOUND,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    }
    if (!user.isEmailVerified)
      return errorResponseWithoutData(
        res,
        STATUS_FORBIDDEN,
        COMMON_MSG.NOT_FOUND.replace('##', USER)
      );
    // generate OTP
    const resetPasswordToken = generateOTP();
    // Set expiry time
    const resetTokenExpiry = moment().add(30, 'minutes').toDate();
    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Send reset password email
    await sendResetPasswordEmail(
      user.email,
      resetPasswordToken,
      user.firstName
    );

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      MSG_RESET_PASSWORD_EMAIL_SENT
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// Reset Password
async function verifyAndResetPasswordHandler(req, res) {
  try {
    const { value, success } = validateResetPassword(req.body, res);
    if (!success) {
      return validationErrorResponseData(res, value.message);
    }

    // Find user and verify OTP
    const user = await Models.User.findOne({
      email: value.email,
      resetPasswordToken: value.otp,
      resetPasswordExpiry: { $gt: new Date() }, // Check if token hasn't expired
    });

    if (!user) {
      return errorResponseWithoutData(
        res,
        STATUS_BAD_REQUEST,
        'Invalid or expired OTP'
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Update user's password and clear reset token fields
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpiry = null;

    await user.save();

    return successResponseWithoutData(
      res,
      STATUS_SUCCESS,
      PASSWORD_RESET_SUCCESS
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
  }
}

// temp api will remove it
async function deleteUser(req, res) {
  try {
    const email = req.query.email;

    // Check if email is provided
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    // Delete the user with the specified email
    const result = await Models.User.deleteOne({ email });

    // Check if a user was deleted
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'User  not found.' });
    }

    // Respond with a success message
    console.log(`user ${email} deleted`);
    return res.status(200).json({ message: 'User  deleted successfully.' });
  } catch (error) {
    console.log(error);
    errorResponseWithoutData(
      res,
      STATUS_INTERNAL_SERVER_ERROR,
      MSG_INTERNAL_SERVER_ERROR
    );
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
  updatePasswordHandler,
  deleteUser,
};
