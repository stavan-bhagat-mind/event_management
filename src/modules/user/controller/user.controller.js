const Models = require('../../../models/index');
const FileService = require('../../../services/file.service');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const {
  validateUserRegister,
  validateLogin,
} = require('../../../modules/user/validations/user.validations');
const { USER } = require('../utils/user.constants');
const { USER_MESSAGE } = require('../utils/user.messages');
require('dotenv').config();
const {
  MSG_INTERNAL_SERVER_ERROR,
  COMMON_MSG,
  MSG_BAD_REQUEST,
  MSG_ACCESS_TOKEN_REFRESHED,
} = require('../../../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_STATUS_CONFLICT,
  STATUS_BAD_REQUEST,
} = require('../../../utils/common/constants');

async function register(req, res) {
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

    // // Process file upload
    // if (req.file) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Profile picture is required',
    //   });
    // }

    // // Upload to MinIO
    // const fileData = await FileService.uploadFile(req.file);

    // Hash password
    const hashedPassword = await bcrypt.hash(value.password, 10);

    // Create user
    const user = await Models.User.create({
      first_name: value.first_name,
      last_name: value.last_name,
      email: value.email,
      user_type: value.user_type,
      password: hashedPassword,
      // profile_picture_url: fileData.url,
      // metadata: {
      //   object_name: fileData.objectName,
      //   bucket: process.env.MINIO_BUCKET,
      // },
    });

    // Remove sensitive data from response
    const userResponse = {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      // profile_picture_url: user.profile_picture_url,
      created_at: user.createdAt,
    };

    return res.status(201).json({
      success: true,
      data: userResponse,
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
async function login(req, res) {
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

async function refreshToken(req, res) {
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
// Get User Profile
async function getProfile(req, res) {
  try {
    const userId = req.userId;
    const user = await Models.User.findById(req.user.id)
      .select('id username email isOnline')
      .populate({
        path: 'groups',
        select: 'name',
        populate: {
          path: 'groupMember',
          select: 'role',
        },
      });

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}

// // Update User Profile
// async function updateProfile(req, res) {
//   try {
//     const { username, email } = req.body;

//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       {
//         $set: {
//           username: username || user.username,
//           email: email || user.email,
//         },
//       },
//       { new: true }
//     ).select('id username email');

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     res.json({
//       success: true,
//       user,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

// // Logout
// async function logout(req, res) {
//   try {
//     const user = await User.findByIdAndUpdate(
//       req.user.id,
//       { isOnline: false },
//       { new: true }
//     );

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     res.json({
//       success: true,
//       message: 'Logged out successfully',
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

// // Get All Users
// async function getAllUsers(req, res) {
//   try {
//     const users = await User.find(
//       { _id: { $ne: req.user.id } },
//       'id username isOnline'
//     );

//     res.json({
//       success: true,
//       users,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

module.exports = {
  register,
  login,
  refreshToken,
  getProfile,
  //   updateProfile,
  //   logout,
  //   getAllUsers,
};
