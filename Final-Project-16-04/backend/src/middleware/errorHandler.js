const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Default error
  let error = {
    message: err.message || 'Internal Server Error',
    status: err.status || 500
  };

  // TypeORM validation error
  if (err.name === 'QueryFailedError') {
    if (err.code === 'ER_DUP_ENTRY') {
      error.message = 'Duplicate field value entered';
      error.status = 400;
    } else if (err.code === 'ER_NO_REFERENCED_ROW_2') {
      error.message = 'Referenced resource not found';
      error.status = 400;
    } else if (err.code === 'ER_DATA_TOO_LONG') {
      error.message = 'Data too long for field';
      error.status = 400;
    } else if (err.code === 'ER_BAD_NULL_ERROR') {
      error.message = 'Required field cannot be null';
      error.status = 400;
    } else {
      error.message = 'Database operation failed';
      error.status = 500;
    }
  }

  // TypeORM Entity not found error
  if (err.name === 'EntityNotFoundError') {
    error.message = 'Resource not found';
    error.status = 404;
  }

  // TypeORM Entity property not found error
  if (err.name === 'EntityPropertyNotFoundError') {
    error.message = 'Invalid property in request';
    error.status = 400;
  }

  // TypeORM connection error
  if (err.name === 'ConnectionNotFoundError' || err.name === 'CannotConnectError') {
    error.message = 'Database connection failed';
    error.status = 500;
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
    error.status = 401;
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
    error.status = 401;
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large';
    error.status = 400;
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field';
    error.status = 400;
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error.message = 'Too many files uploaded';
    error.status = 400;
  }

  // AWS S3 errors
  if (err.name === 'S3Error' || err.name === 'ServiceException') {
    error.message = 'File storage error';
    error.status = 500;
  }

  // Network/timeout errors
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
    error.message = 'Service temporarily unavailable';
    error.status = 503;
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error.message = err.message;
    error.status = 400;
  }

  // Send error response
  res.status(error.status).json({
    success: false,
    error: error.message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      originalError: err.name 
    })
  });
};

module.exports = errorHandler; 