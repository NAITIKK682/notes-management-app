/**
 * Global Express error handling middleware
 * Logs full error stack internally and returns generic message to client
 * @param {Error} err - The error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function (not used but required signature)
 */
export default (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log full error details internally
  console.error('Error:', {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    statusCode: error.statusCode || 500,
    message: error.message,
    stack: err.stack,
    body: req.body
  });

  // Mongoose validation errors
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    res.status(400).json({
      success: false,
      message: messages.join(', ')
    });
    return;
  }

  // Mongoose duplicate key errors
  if (error.code === 11000) {
    res.status(400).json({
      success: false,
      message: 'Duplicate field value entered'
    });
    return;
  }

  // Determine status code (default to 500)
  const statusCode = error.statusCode || error.status || 500;

  // Validate status code is in 400-599 range
  const validStatus = statusCode >= 400 && statusCode < 600 ? statusCode : 500;

  // Return generic error response to client (never expose internal details)
  res.status(validStatus).json({
    success: false,
    message: validStatus === 500
      ? 'Internal Server Error'
      : error.message || 'An error occurred processing your request'
  });
};

