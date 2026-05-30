/**
 * Send a successful response
 */
function sendSuccess(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Send a created response
 */
function sendCreated(res, data = {}, message = 'Created successfully') {
  return sendSuccess(res, data, message, 201);
}

/**
 * Send an error response
 */
function sendError(res, message = 'An error occurred', statusCode = 400, errors = null) {
  const body = { success: false, message };
  if (errors) body.errors = errors;
  return res.status(statusCode).json(body);
}

/**
 * Send pagination metadata alongside data
 */
function sendPaginated(res, data, total, page, limit) {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / limit),
    },
  });
}

module.exports = { sendSuccess, sendCreated, sendError, sendPaginated };
