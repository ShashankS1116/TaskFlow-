const { validationResult } = require('express-validator');
const { sendError } = require('../utils/response');

/**
 * Run express-validator checks and return 400 on failure
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(
      res,
      'Validation failed',
      400,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}

module.exports = { validate };
