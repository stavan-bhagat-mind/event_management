const jwt = require('jsonwebtoken');
const {
  errorResponseWithoutData,
  errorResponseData,
} = require('../utils/response');

const {
  INVALID_TOKEN,
  MSG_ACCESS_TOKEN_MISSING,
  MSG_TOKEN_EXPIRED,
  MSG_INTERNAL_SERVER_ERROR,
} = require('../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_FORBIDDEN,
  STATUS_UNAUTHORIZED,
} = require('../utils/common/constants');

const authenticationMiddleware = (req, res, next) => {
  try {
    const authenticationToken = req.headers['authorization'];
    if (!authenticationToken) {
      return errorResponseWithoutData(
        res,
        STATUS_UNAUTHORIZED,
        MSG_ACCESS_TOKEN_MISSING
      );
    }
    const token = authenticationToken.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return errorResponseWithoutData(
        res,
        STATUS_UNAUTHORIZED,
        MSG_TOKEN_EXPIRED
      );
    } else if (error.name === 'JsonWebTokenError') {
      return errorResponseData(
        res,
        STATUS_FORBIDDEN,
        INVALID_TOKEN,
        error.name
      );
    } else {
      console.error('Authentication error:', error);
      return errorResponseWithoutData(
        res,
        STATUS_INTERNAL_SERVER_ERROR,
        MSG_INTERNAL_SERVER_ERROR
      );
    }
  }
};

module.exports = authenticationMiddleware;
