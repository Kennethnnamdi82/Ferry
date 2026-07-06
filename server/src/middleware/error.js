import { MAX_UPLOAD_LABEL } from '../config/uploadLimits.js';

export default function errorHandler(err, _req, res, _next) {
  console.error(err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`,
    });
  }

  const status = err.status || err.statusCode || err.http_code || 500;
  res.status(status).json({
    message: err.message || 'Server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
