const Models = require('../../../models/index');
const FileService = require('../../../services/file.service');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function register(req, res) {
  try {
    const { first_name, last_name, email, password, user_type } = req.body;

    // Validate required fields
    if (!first_name || !last_name || !email || !password || !user_type) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    // Check for existing user
    const existingUser = await Models.User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Process file upload
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Profile picture is required',
      });
    }

    // Upload to MinIO
    const fileData = await FileService.uploadFile(req.file);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await Models.User.create({
      first_name,
      last_name,
      email,
      user_type,
      password: hashedPassword,
      profile_picture_url: fileData.url,
      metadata: {
        object_name: fileData.objectName,
        bucket: process.env.MINIO_BUCKET,
      },
    });

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, userType: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove sensitive data from response
    const userResponse = {
      id: user._id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      user_type: user.user_type,
      profile_picture_url: user.profile_picture_url,
      created_at: user.createdAt,
    };

    return res.status(201).json({
      success: true,
      data: userResponse,
      token,
    });
  } catch (error) {
      console.error(`Registration error: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
}

// // User Login
// async function login(req, res) {
//   try {
//     const { username, password } = req.body;

//     // Find user
//     const user = await User.findOne({ username });

//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);

//     if (!isMatch) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid credentials',
//       });
//     }

//     // Update online status
//     await User.findByIdAndUpdate(user._id, { isOnline: true });

//     // Generate JWT token
//     const token = jwt.sign(
//       { id: user._id, username: user.username },
//       process.env.JWT_SECRET,
//       { expiresIn: '24h' }
//     );

//     res.json({
//       success: true,
//       user: {
//         id: user._id,
//         username: user.username,
//       },
//       token,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }

// // Get User Profile
// async function getProfile(req, res) {
//   try {
//     const user = await User.findById(req.user.id)
//       .select('id username email isOnline')
//       .populate({
//         path: 'groups',
//         select: 'name',
//         populate: {
//           path: 'groupMember',
//           select: 'role',
//         },
//       });

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
  //   login,
  //   getProfile,
  //   updateProfile,
  //   logout,
  //   getAllUsers,
};
