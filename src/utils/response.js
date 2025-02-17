'use strict';

const {
  CODE,
  STATUS_SUCCESS,
  STATUS_BAD_REQUEST,
} = require('./common/constants');

module.exports = {
  successResponseData(res, data, statusCode, message, extras) {
    const response = {
      data,
      meta: {
        code: CODE.SUCCESS,
        message,
      },
    };
    if (extras) {
      Object.keys(extras).forEach((key) => {
        if ({}.hasOwnProperty.call(extras, key)) {
          response.meta[key] = extras[key];
        }
      });
    }

    return res.status(statusCode).json(response);
  },

  successResponseWithoutData(res, responseCode, message) {
    const response = {
      data: null,
      meta: {
        code: CODE.SUCCESS,
        message,
      },
    };

    return res.status(responseCode).json(response);
  },

  errorResponseWithoutData(res, statusCode, message) {
    const response = {
      data: null,
      meta: {
        code: CODE.FAIL,
        message,
      },
    };

    return res.status(statusCode).json(response);
  },

  errorResponseData(res, statusCode, message, extras) {
    const response = {
      data: null,
      meta: {
        code: CODE.FAIL,
        message,
      },
    };
    if (extras) {
      Object.keys(extras).forEach((key) => {
        if ({}.hasOwnProperty.call(extras, key)) {
          response[key] = extras[key];
        }
      });
    }

    return res.status(statusCode).json(response);
  },

  validationErrorResponseData(res, message, extras) {
    const response = {
      data: null,
      meta: {
        code: CODE.FAIL,
        message,
      },
    };
    if (extras) {
      Object.keys(extras).forEach((key) => {
        if ({}.hasOwnProperty.call(extras, key)) {
          response[key] = extras[key];
        }
      });
    }
    return res.status(STATUS_BAD_REQUEST).json(response);
  },

  //   errorResponseDataLeave(
  //     message,
  //     code = CODE.FAIL,
  //     statusCode = STATUS_BAD_REQUEST,
  //     first_date,
  //     second_date
  //   ) {
  //     const response = {
  //       data: null,
  //       meta: {
  //         code,
  //         message,
  //         first_date,
  //         second_date,
  //       },
  //     };
  //     return {
  //       statusCode: statusCode,
  //       body: JSON.stringify(response),
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Access-Control-Allow-Origin': '*',
  //         'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  //       },
  //     };
  //   },

  //   errorResponseWithData(data, code = CODE.FAIL, message, statusCode) {
  //     const response = {
  //       data,
  //       meta: {
  //         code,
  //         message,
  //       },
  //     };

  //     return {
  //       statusCode,
  //       body: JSON.stringify(response),
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Access-Control-Allow-Origin': '*',
  //         'Access-Control-Allow-Methods': 'OPTIONS, POST, GET, PUT, DELETE',
  //         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  //       },
  //     };
  //   },
};
