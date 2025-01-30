const Models = require('../../../models/index');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// User Registration
async function register(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(STATUS_BAD_REQUEST).json({ message: MSG_BAD_REQUEST });
    }
    const { first_name, last_name, email, password, user_type } = req.body;
    const profile_picture_url = req.files.map((file) => file.path);

    // Check for existing user
    const existingUser = await Models.User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = await Models.User.create({
      first_name,
      last_name,
      email,
      user_type,
      password: hashedPassword,
      profile_picture_url,
    });

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profile_picture_url: user.profile_picture_url,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
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
