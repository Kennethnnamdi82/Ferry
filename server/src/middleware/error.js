import { MAX_UPLOAD_LABEL } from '../config/uploadLimits.js';
import { ZodError } from 'zod';

export default function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: err.issues[0]?.message || 'Invalid request' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'An account or record with these details already exists.' });
  }
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid request data' });
  }
  console.error('[request]', err.name || 'Error', err.code || '');
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `File is too large. Maximum upload size is ${MAX_UPLOAD_LABEL}.`,
    });
  }

  const status = err.status || err.statusCode || err.http_code || 500;
  res.status(status).json({
    message: status >= 500 ? 'Service temporarily unavailable. Please try again.' : err.message || 'Request failed',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
