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
    BOOKING: 'Booking',
    PAYMENT: 'Payment',
    SUBSCRIPTION: 'Subscription',
    EMAIL: 'Email',
    NOTIFICATION: 'Notification',
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
  // Subscription subject messages
  EMAIL: {
    SUBJECTS: {
      VERIFICATION: 'Verify Your Email Address',
      RESET_PASSWORD: 'Reset Your Password',
      SUBSCRIPTION_STARTED: 'Welcome to Your Subscription',
      PAYMENT_FAILURE: 'Payment Failed for Your Subscription',
      CANCELLATION: 'Subscription Cancellation Confirmed',
      EXPIRATION: 'Your Subscription Has Expired',
      RENEWAL_STATUS: 'Subscription Renewal Status Updated',
      RECOVERY: 'Your Subscription Has Been Recovered',
      GRACE_PERIOD_EXPIRED: 'Grace Period Ended - Subscription Expired',
    },
  },
  // links
  LINKS: {
    SUPPORT: 'https://support.google.com/',
  },
  // images
  IMAGE_URL: {
    APP_LOGO:
      'https://media-hosting.imagekit.io/740317022e9349ed/rn_image_picker_lib_temp_22395d66-3916-47ad-8c4c-5e04f38bc9c5.png?Expires=1838960234&Key-Pair-Id=K2ZIVPTIP2VGHC&Signature=F1WJjdwFroM38nZ0LjIzVYkPbkj1x5e0EZz6FH3xj1K-BOjg5AgUzECksCupf1QD9JZ7EPOQDgnbJRNAfIcwzkSyYKD3mI2fK8xsW2V1mweLtldtREUGuKP57XuM2kTZXdqAJMXW6qu8lEk3q7L~fMqEk6ZeserOxLgRPwY7A4g89eiWdo0sDf3hvdT7xIw~9gnS~4SWi46DThz~2Y65VceVyCRuke6BhR5GKe7XBnSXatdbUyNSMYg92fqWG5E7gKAwanGFG3dzWRPN11RcyLCTcylWBYSIDSFEdA-L-wShUjgWf92RGd7PGjGJrjn0Z9u~lSr4qwFEej2-kIjnbg__',
    VERIFICATION: 'https://i.ibb.co/8L3gfy4F/email-2151046-640.webp',
    RESET_PASSWORD: 'https://i.ibb.co/bjn5nn6K/lock.png',
    SUBSCRIPTION: {
      SUBSCRIPTION_MAIN:
        'https://cdn-icons-png.flaticon.com/512/5234/5234307.png',
      PAYMENT_FAILURE:
        'https://static.vecteezy.com/system/resources/previews/004/968/453/non_2x/failed-to-make-payment-by-credit-card-concept-illustration-flat-design-eps10-modern-graphic-element-for-landing-page-empty-state-ui-infographic-vector.jpg',
      CANCELLATION:
        'https://png.pngtree.com/png-vector/20221125/ourmid/pngtree-cancel-icon-png-image_6480369.png',
      EXPIRATION:
        'https://cdn-icons-png.freepik.com/256/5626/5626141.png?semt=ais_hybrid',

      RENEWAL_STATUS:
        'https://cdn-icons-png.flaticon.com/512/11264/11264720.png',
      RECOVERY: 'https://i.ibb.co/recovery-icon.png',
      GRACE_PERIOD_EXPIRED:
        'https://cdn-icons-png.flaticon.com/512/2037/2037117.png',
      SUBSCRIPTION_STARTED:
        'https://img.freepik.com/premium-vector/success-online-payment-icon-illustration-design_8499-6184.jpg',
      PLAN_CHANGED: 'https://cdn-icons-png.flaticon.com/512/11287/11287714.png',
    },
  },
};
