const Joi = require('joi');
// const { ROLE } = require('../../../utils/common/constants');
const { BAD_REQUEST } = require('../../../utils/common/messages');
const { STATUS_BAD_REQUEST } = require('../../../utils/common/constants');

const validateEventData = (data, res) => {
  const validationSchema = Joi.object({
    title: Joi.string().required().messages({
      'any.required': 'Event title is required',
    }),
    description: Joi.string().optional(),
    location: Joi.string().required().messages({
      'any.required': 'Event location is required',
    }),
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/, 'date')
      .required()
      .messages({
        'string.pattern.name': 'Date format must be YYYY-MM-DD',
        'any.required': 'Event date is required',
      }),
    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time')
      .required()
      .messages({
        'string.pattern.name': 'Time format must be HH:MM in 24-hour format',
        'any.required': 'Start time is required',
      }),
    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time')
      .required()
      .messages({
        'string.pattern.name': 'Time format must be HH:MM in 24-hour format',
        'any.required': 'End time is required',
      })
      .custom((value, helpers) => {
        const { startTime } = helpers.state.ancestors[0];
        if (value <= startTime) {
          return helpers.error('any.invalid');
        }
        return value;
      })
      .messages({
        'any.invalid': 'End time must be after start time',
      }),
    seats: Joi.number().integer().min(1).required().messages({
      'any.required': 'Total seats count is required',
      'number.min': 'Minimum 1 seat required',
    }),
    price: Joi.number().greater(0).required().messages({
      'any.required': 'Price is required',
      'number.greater': 'Price cannot be negative',
    }),
    organizer: Joi.string().required(),
    // existingImages: Joi.array().items(Joi.string().required()).optional(),
    existingImages: Joi.string().optional(),
  });
  const { error, value } = validationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};
const validateEventsData = (data, res) => {
  const validationSchema = Joi.object({
    title: Joi.string().required().messages({
      'any.required': 'Event title is required',
    }),
    description: Joi.string().optional(),
    location: Joi.string().required().messages({
      'any.required': 'Event location is required',
    }),
    date: Joi.string()
      .pattern(/^\d{4}-\d{2}-\d{2}$/, 'date')
      .required()
      .messages({
        'string.pattern.name': 'Date format must be YYYY-MM-DD',
        'any.required': 'Event date is required',
      }),
    startTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time')
      .required()
      .messages({
        'string.pattern.name': 'Time format must be HH:MM in 24-hour format',
        'any.required': 'Start time is required',
      }),
    endTime: Joi.string()
      .pattern(/^([01]\d|2[0-3]):([0-5]\d)$/, 'time')
      .required()
      .messages({
        'string.pattern.name': 'Time format must be HH:MM in 24-hour format',
        'any.required': 'End time is required',
      })
      .custom((value, helpers) => {
        const { startTime } = helpers.state.ancestors[0];
        if (value <= startTime) {
          return helpers.error('any.invalid');
        }
        return value;
      })
      .messages({
        'any.invalid': 'End time must be after start time',
      }),
    seats: Joi.number().integer().min(1).required().messages({
      'any.required': 'Total seats count is required',
      'number.min': 'Minimum 1 seat required',
    }),
    price: Joi.number().greater(0).required().messages({
      'any.required': 'Price is required',
      'number.greater': 'Price cannot be negative',
    }),
    organizer: Joi.string().required(),
    images: Joi.array().items(Joi.string().required()).required(),
  });
  const { error, value } = validationSchema.validate(data);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};
const validateId = (id) => {
  const validationSchema = Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'Event ID is required',
    }),
  });
  const { error, value } = validationSchema.validate(id);
  return {
    success: error ? false : true,
    value: error ? error : value,
  };
};
module.exports = {
  validateEventData,
  validateEventsData,
};
