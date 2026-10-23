'use strict';

const jwt = require('jsonwebtoken');
const env = require('../../config/env');

/** FR-AUTH-03: the token holds the user id (subject) and the system role only. */
function signToken(user) {
  return jwt.sign({ role: user.system_role }, env.jwtSecret, {
    subject: String(user.id),
    expiresIn: env.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] });
}

module.exports = { signToken, verifyToken };
