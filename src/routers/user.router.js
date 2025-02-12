const userRouter = require('express').Router();
const {
  registerHandler,
  loginHandler,
  refreshTokenHandler,
  userVerificationHandler,
  getUserDataHandler,
  resendVerificationEmail,
  updateUserProfileHandler,
  forgotPasswordHandler,
  verifyAndResetPasswordHandler,
  updatePasswordHandler,
  deleteUser,
} = require('../modules/user/controller/user.controller');
const authentication = require('../middlewares/authentication.middleware');
const { createRateLimiter } = require('../middlewares/rateLimiter.middleware');
const { singleUpload } = require('../config/multer.config');

userRouter.post('/register', registerHandler);
userRouter.post('/login', loginHandler);
userRouter.get('/get-user', authentication, getUserDataHandler);
userRouter.patch(
  '/update-user',
  authentication,
  singleUpload('file'),
  updateUserProfileHandler
);
userRouter.get('/verify/:token', userVerificationHandler);
userRouter.post(
  '/resend/verify',
  createRateLimiter('verify-email'),
  resendVerificationEmail
);
userRouter.get('/refresh-token', refreshTokenHandler);
userRouter.post(
  '/forgot-password',
  createRateLimiter('reset-password'),
  forgotPasswordHandler
);
userRouter.post('/reset-password', verifyAndResetPasswordHandler);
userRouter.patch('/update-password', authentication, updatePasswordHandler);
userRouter.delete('/delete', deleteUser);

module.exports = userRouter;
