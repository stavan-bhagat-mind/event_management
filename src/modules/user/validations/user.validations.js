const Joi = require('joi');
const { ROLE } = require('../../../utils/common/constants');
const { BAD_REQUEST } = require('../../../utils/common/messages');
const { STATUS_BAD_REQUEST } = require('../../../utils/common/constants');

const validateUserRegister = (data, res) => {
  s;
  const userValidationSchema = Joi.object({
    first_name: Joi.string().min(3).max(30).required(),
    last_name: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    user_type: Joi.string()
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

module.exports = {
  validateUserRegister,
  validateLogin,
};
