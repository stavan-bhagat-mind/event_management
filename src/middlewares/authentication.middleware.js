// const jwt = require('jsonwebtoken');
// const jwtKey = process.env.JWT_SECRET;
// const {
//   STATUS_UNAUTHORIZED,
//   STATUS_TOKEN_EXPIRED,
//   MSG_ACCESS_TOKEN_MISSING,
//   MSG_TOKEN_EXPIRED,
//   MSG_INVALID_ACCESS_TOKEN,
// } = require('../utils/common/messages');

const authentication = async (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1];

    if (!accessToken) {
      return res
        .status(STATUS_UNAUTHORIZED)
        .json({ success: false, message: MSG_ACCESS_TOKEN_MISSING });
    }
    try {
      const decoded = jwt.verify(accessToken, jwtKey);
      req.userData = decoded;
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res
          .status(STATUS_TOKEN_EXPIRED)
          .json({ success: false, message: MSG_TOKEN_EXPIRED });
      } else {
        return res
          .status(STATUS_UNAUTHORIZED)
          .json({ success: false, message: MSG_INVALID_ACCESS_TOKEN });
      }
    }
  } catch (error) {
    res
      .status(STATUS_UNAUTHORIZED)
      .json({ success: false, message: MSG_INVALID_ACCESS_TOKEN });
  }
};

module.exports = authentication;

// ----------------------------------------------------------
const jwt = require('jsonwebtoken');
const jwtKey = process.env.JWT_SECRET;
const {
  STATUS_UNAUTHORIZED,
  STATUS_TOKEN_EXPIRED,
  MSG_ACCESS_TOKEN_MISSING,
  MSG_TOKEN_EXPIRED,
  MSG_INVALID_ACCESS_TOKEN,
} = require('../utils/common/messages');

const authenticationMiddleware = (req, res, next) => {
  try {
    const authenticationToken = req.headers['authorization'];
    if (!authenticationToken) {
      res.status(STATUS_UNAUTHORIZED).json({
        success: false,
        data: null,
        message: MSG_ACCESS_TOKEN_MISSING,
      });
    }
    const token = authenticationToken.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_KEY);
    req.userId = decoded.data.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.status(STATUS_UNAUTHORIZED).send({
        data: null,
        message: MSG_TOKEN_EXPIRED,
        errorName: error.name,
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(http.FORBIDDEN.code).send({
        data: null,
        message: errors.INVALID_TOKEN,
        errorName: error.name,
      });
    } else {
      res.status(http.INTERNAL_SERVER_ERROR.code).send({
        data: null,
        message: http.INTERNAL_SERVER_ERROR.message,
      });
    }
  }
};

module.exports = authenticationMiddleware;
