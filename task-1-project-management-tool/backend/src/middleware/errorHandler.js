'use strict';

const { ZodError } = require('zod');
const { HttpError } = require('../utils/httpError');
const env = require('../config/env');

function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' } });
}

// NFR-REL-03: 400 invalid input, 401 not logged in, 403 not allowed, 404 not found.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: details[0]?.message || 'Invalid input', details },
    });
  }

  if (err instanceof HttpError) {
    const body = { code: err.code, message: err.message };
    if (err.details !== undefined) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
  }
  if (err.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'This record already exists' } });
  }
  if (err.code === '23503') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Related record is missing or still in use' } });
  }

  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProduction ? 'Something went wrong' : err.message,
    },
  });
}

module.exports = { errorHandler, notFoundHandler };
