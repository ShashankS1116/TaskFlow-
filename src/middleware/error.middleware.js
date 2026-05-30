const { Prisma } = require('@prisma/client');

function errorHandler(err, req, res, next) {
  console.error('🔥 Error:', err);

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return res.status(409).json({
          success: false,
          message: `A record with this ${err.meta?.target?.join(', ')} already exists`,
        });
      case 'P2025':
        return res.status(404).json({
          success: false,
          message: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          success: false,
          message: 'Related record not found',
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'Database error',
          code: err.code,
        });
    }
  }

  // Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ success: false, message: 'Token expired' });
  }

  // Default error
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
