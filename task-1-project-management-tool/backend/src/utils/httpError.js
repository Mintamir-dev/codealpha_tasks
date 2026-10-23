'use strict';

class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  HttpError,
  badRequest: (message = 'Invalid request', details, code = 'BAD_REQUEST') =>
    new HttpError(400, code, message, details),
  unauthorized: (message = 'You must log in first', code = 'UNAUTHORIZED') =>
    new HttpError(401, code, message),
  forbidden: (message = 'You are not allowed to do this', code = 'FORBIDDEN') =>
    new HttpError(403, code, message),
  notFound: (message = 'Not found', code = 'NOT_FOUND') => new HttpError(404, code, message),
  conflict: (message = 'Conflict', details, code = 'CONFLICT') =>
    new HttpError(409, code, message, details),
  tooMany: (message = 'Try again later') => new HttpError(429, 'TOO_MANY_REQUESTS', message),
};
