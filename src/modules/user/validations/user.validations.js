const Joi = require('joi');
const { ROLE } = require('../../../utils/common/constants');
const { BAD_REQUEST } = require('../../../utils/common/messages');
const { STATUS_BAD_REQUEST } = require('../../../utils/common/constants');

const validateUserRegister = (data, res) => {
  const userValidationSchema = Joi.object({
    firstName: Joi.string().min(3).max(30).required(),
    lastName: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    userType: Joi.string()
      .valid(...ROLE)
      .required(),
  });
  const { error, value } = userValidationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};

const validateLogin = (data, res) => {
  const loginValidationSchema = Joi.object({
    email: Joi.string()
      .email({
        minDomainSegments: 2,
        tlds: { allow: ['com', 'net'] },
      })
      .required(),
    password: Joi.string().min(6).required(),
  });
  const { error, value } = loginValidationSchema.validate(data);

  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};

const validateUserUpdate = (data, res) => {
  const userValidationSchema = Joi.object({
    firstName: Joi.string().min(3).max(30).required(),
    lastName: Joi.string().min(3).max(30).required(),
    // email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    // userType: Joi.string()
    //   .valid(...ROLE)
    //   .required(),
    contactNumber: Joi.string()
      .regex(/^[0-9]{10}$/)
      .messages({ 'string.pattern.base': `Phone number must have 10 digits.` })
      .optional(),
  });
  const { error, value } = userValidationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};

const validateResetPassword = (data, res) => {
  const resetPasswordValidationSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().required(),
    password: Joi.string().min(6).required(),
    confirmPassword: Joi.string()
      .valid(Joi.ref('password'))
      .messages({
        'incorrect password': `password and confirm password is not same.`,
      })
      .required(),
  });
  const { error, value } = resetPasswordValidationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};

module.exports = {
  validateUserRegister,
  validateLogin,
  validateUserUpdate,
  validateResetPassword,
};
