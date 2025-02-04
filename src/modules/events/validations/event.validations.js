const Joi = require('joi');
// const { ROLE } = require('../../../utils/common/constants');
const { BAD_REQUEST } = require('../../../utils/common/messages');
const { STATUS_BAD_REQUEST } = require('../../../utils/common/constants');

const validateEventData = (data, res) => {
  const validationSchema = Joi.object({
    title: Joi.string().required(),
    description: Joi.string().optional(),
    location: Joi.string().required(),
    date: Joi.date().iso().required(),
    seats: Joi.object({
      total: Joi.number().integer().min(1).required()
    }).required(),
    price: Joi.number().greater(0).required(),
    creator: Joi.string().required(),
  });
  const { error, value } = validationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};

module.exports = {
  validateEventData,
};
