module.exports = {
  ROLE: ['attendee', 'event_manager'],
  SERVICE_NAME: 'gmail',
  APP: {
    NAME: 'EventifY',
    DESCRIPTION: 'Event Management System',
  },
  CATEGORY: {
    USER: 'User',
    EVENT: 'Event',
  },
  CODE: {
    SUCCESS: 1,
    FAIL: 0,
  },
  // http-Status-Codes
  STATUS_SUCCESS: 200,
  STATUS_CREATED: 201,
  STATUS_BAD_REQUEST: 400,
  STATUS_UNAUTHORIZED: 401,
  STATUS_NOT_FOUND: 404,
  STATUS_INTERNAL_SERVER_ERROR: 500,
  STATUS_FORBIDDEN: 403,
  STATUS_TOKEN_EXPIRED: 419,
  STATUS_STATUS_CONFLICT: 409,
  STATUS_TO_MANY_REQUEST: 429,
};
