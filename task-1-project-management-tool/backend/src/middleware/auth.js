'use strict';

const asyncHandler = require('../utils/asyncHandler');
const { unauthorized, forbidden } = require('../utils/httpError');
const { verifyToken } = require('../modules/auth/token');
const usersRepo = require('../modules/users/users.repository');

/**
 * FR-AUTH-06 / NFR-SEC-03: every protected request needs a valid token (401 otherwise).
 * The user is loaded from the database each time, so a deleted account stops working
 * immediately and the system role is never trusted from the token alone.
 */
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw unauthorized();

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw unauthorized('Your session has expired. Please log in again.', 'TOKEN_INVALID');
  }

  const user = await usersRepo.findById(Number(payload.sub));
  if (!user) throw unauthorized('Your session has expired. Please log in again.', 'TOKEN_INVALID');

  req.user = { id: user.id, name: user.name, email: user.email, systemRole: user.system_role };
  next();
});

function requireAdmin(req, res, next) {
  if (req.user.systemRole !== 'admin') return next(forbidden('Administrators only', 'ADMIN_ONLY'));
  return next();
}

module.exports = { authenticate, requireAdmin };
