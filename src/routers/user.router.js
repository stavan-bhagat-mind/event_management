  const userRouter = require('express').Router();
  const {
    register,
    //   login,
    //   logout,
    //   refreshToken,
  } = require('../modules/user/controller/user.controller');
  const authentication = require('../middlewares/authentication.middleware');
  // const {
  //   uploadFile,
  //   downloadFile,
  //   upload,
  // } = require('../controllers/fileController');
  // const { uploadFile } = require('../modules/user/controller/upload.controller');
  const { singleUpload } = require('../config/multer.config');

  userRouter.post('/register', singleUpload('file'), register);

// userRouter.post('/login', login);
// userRouter.post('/logout', logout);
// userRouter.post('/refresh-token', refreshToken);

module.exports = userRouter;
