const jwt = require('jsonwebtoken');
const jwtKey = process.env.JWT_SECRET;
const {
  STATUS_UNAUTHORIZED,
  STATUS_TOKEN_EXPIRED,
  INVALID_TOKEN,
  MSG_ACCESS_TOKEN_MISSING,
  MSG_TOKEN_EXPIRED,
  MSG_INVALID_ACCESS_TOKEN,
  MSG_INTERNAL_SERVER_ERROR,
} = require('../utils/common/messages');
const {
  STATUS_INTERNAL_SERVER_ERROR,
  STATUS_FORBIDDEN,
} = require('../utils/common/constants');

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      res.status(STATUS_UNAUTHORIZED).send({
        data: null,
        message: MSG_TOKEN_EXPIRED,
        errorName: error.name,
      });
    } else if (error.name === 'JsonWebTokenError') {
      res.status(STATUS_FORBIDDEN).send({
        data: null,
        message: INVALID_TOKEN,
        errorName: error.name,
      });
    } else {
      console.error('Authentication error:', error);
      res.status(STATUS_INTERNAL_SERVER_ERROR).send({
        data: null,
        message: MSG_INTERNAL_SERVER_ERROR,
      });
    }
  }
};

module.exports = authenticationMiddleware;
